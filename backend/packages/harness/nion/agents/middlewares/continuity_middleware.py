from __future__ import annotations

import re

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from nion.config.paths import Paths, get_paths
from nion.openviking import build_context_pack_markdown, classify_retrieval_intent
from nion.openviking.runtime_retriever import RuntimeNotebookRetriever
from nion.recall.local_archive import LocalRecallArchive


class ContinuityMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir=None):
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()
        self._archive = LocalRecallArchive(self._paths.recall_db_file)
        self._notebook_retriever = RuntimeNotebookRetriever(base_dir=base_dir)

    def before_model(self, state: AgentState, runtime: Runtime) -> dict | None:
        thread_id = runtime.context.get("thread_id") if runtime.context else None
        if not thread_id:
            return None

        latest_human = next(
            (
                message
                for message in reversed(state.get("messages", []))
                if isinstance(message, HumanMessage)
            ),
            None,
        )
        if latest_human is None:
            return None

        latest_content = str(latest_human.content)
        recall_results = self._search_candidates(thread_id, latest_content)
        notebook_context = self._search_notebook_context(latest_content)
        if not recall_results and not notebook_context:
            return None

        blocks: list[str] = []
        if recall_results:
            summary = "\n".join(f"- {row.snippet}" for row in recall_results)
            blocks.append(summary)
        if notebook_context:
            blocks.append(notebook_context)
        return {
            "messages": [
                SystemMessage(
                    content=f"<continuity_context>\n" + "\n\n".join(blocks) + "\n</continuity_context>"
                )
            ]
        }

    def _search_candidates(self, thread_id: str, content: str):
        tokens = [token for token in re.findall(r"[A-Za-z0-9_]+", content.lower()) if len(token) >= 4]
        candidates: list[str] = []
        if tokens:
            deduped = list(dict.fromkeys(tokens))
            candidates.append(" ".join(deduped))
            candidates.extend(reversed(deduped))
        else:
            candidates.append(content)

        for query in candidates:
            results = self._archive.search_thread(thread_id, query, limit=3)
            if results:
                return results
        return []

    def _search_notebook_context(self, content: str) -> str:
        intent = classify_retrieval_intent(content)
        if not intent.search_notebook:
            return ""
        queries = self._notebook_queries(content)
        pack = None
        for query in queries:
            candidate = self._notebook_retriever.search(query, limit=3)
            if candidate.items:
                pack = candidate
                break
        if pack is None:
            return ""
        return build_context_pack_markdown(pack.items)

    def _notebook_queries(self, content: str) -> list[str]:
        raw = content.strip()
        tokens = [token for token in re.findall(r"[A-Za-z0-9_]+", raw.lower()) if len(token) >= 3]
        candidates: list[str] = []
        if raw:
            candidates.append(raw)
        if tokens:
            deduped = list(dict.fromkeys(tokens))
            candidates.append(" ".join(deduped))
            candidates.extend(reversed(deduped))
        return candidates
