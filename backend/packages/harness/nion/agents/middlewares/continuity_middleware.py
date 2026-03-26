from __future__ import annotations

import re

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from nion.config.paths import Paths, get_paths
from nion.recall.local_archive import LocalRecallArchive


class ContinuityMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir=None):
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()
        self._archive = LocalRecallArchive(self._paths.recall_db_file)

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

        results = self._search_candidates(thread_id, str(latest_human.content))
        if not results:
            return None

        summary = "\n".join(f"- {row.snippet}" for row in results)
        return {
            "messages": [
                SystemMessage(
                    content=f"<continuity_context>\n{summary}\n</continuity_context>"
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
