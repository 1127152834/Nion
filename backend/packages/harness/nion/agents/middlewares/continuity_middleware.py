from __future__ import annotations

import re

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from nion.config.paths import Paths, get_paths
from nion.memory.session_policy import resolve_memory_session_policy
from nion.memory_os.context_assembler import MemoryOSContextAssembler
from nion.memory_os.repository import MemoryOSRepository
from nion.recall.local_archive import LocalRecallArchive


class ContinuityMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir=None):
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()
        self._archive = LocalRecallArchive(self._paths.recall_db_file)
        self._memory_repo = MemoryOSRepository(self._paths.memory_os_index_db_file)

    def before_model(self, state: AgentState, runtime: Runtime) -> dict | None:
        thread_id = runtime.context.get("thread_id") if runtime.context else None
        if not thread_id:
            return None
        policy = resolve_memory_session_policy(runtime.context if runtime.context else None)

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
        memory_block = ""
        if policy.memory_read:
            memory_pack = MemoryOSContextAssembler(self._memory_repo).build_runtime_memory_pack(
                query=latest_content,
                thread_id=thread_id,
                memory_read=True,
                base_dir=str(self._paths.base_dir),
            )
            memory_block = memory_pack.to_prompt_block()
        recall_results = self._search_candidates(thread_id, latest_content)
        if not recall_results and not memory_block:
            return None

        blocks: list[str] = []
        if memory_block:
            blocks.append(memory_block)
        if recall_results:
            blocks.append(
                "<continuity_context>\n"
                + "\n".join(f"- {row.snippet}" for row in recall_results)
                + "\n</continuity_context>"
            )

        return {
            "messages": [
                SystemMessage(
                    content="\n\n".join(blocks)
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
