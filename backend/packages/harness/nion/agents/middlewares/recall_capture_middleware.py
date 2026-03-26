from __future__ import annotations

import re
from typing import Any

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langgraph.runtime import Runtime

from nion.config.paths import Paths, get_paths
from nion.recall.filtering import normalize_message_content
from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallTurn

_UPLOAD_BLOCK_RE = re.compile(r"<uploaded_files>[\s\S]*?</uploaded_files>\n*", re.IGNORECASE)
_EXCLUDED_HUMAN_PREFIXES = (
    "Here are the images you've viewed:",
    "Here are the details of the images you've viewed:",
)


class RecallCaptureMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir=None, agent_name: str = "lead_agent"):
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()
        self._archive = LocalRecallArchive(self._paths.recall_db_file)
        self._agent_name = agent_name

    def _turn(
        self,
        role: str,
        content: str,
        *,
        source_message_id: str | None = None,
    ) -> RecallTurn:
        return RecallTurn(role=role, content=content, source_message_id=source_message_id)

    def _collect_latest_exchange(self, messages: list[Any]) -> list[RecallTurn]:
        recallable: list[RecallTurn] = []
        for msg in messages:
            msg_type = getattr(msg, "type", None)
            if msg_type == "human":
                content = normalize_message_content(getattr(msg, "content", ""))
                if not content:
                    continue
                if "<uploaded_files>" in content:
                    content = _UPLOAD_BLOCK_RE.sub("", content).strip()
                if not content:
                    continue
                if any(content.startswith(prefix) for prefix in _EXCLUDED_HUMAN_PREFIXES):
                    continue
                recallable.append(
                    self._turn(
                        "human",
                        content,
                        source_message_id=getattr(msg, "id", None),
                    )
                )
            elif msg_type == "ai" and not getattr(msg, "tool_calls", None):
                content = normalize_message_content(getattr(msg, "content", ""))
                if not content:
                    continue
                recallable.append(
                    self._turn(
                        "ai",
                        content,
                        source_message_id=getattr(msg, "id", None),
                    )
                )

        trailing_ai: list[RecallTurn] = []
        for turn in reversed(recallable):
            if turn.role == "ai":
                trailing_ai.append(turn)
                continue
            if turn.role == "human":
                return [turn, *reversed(trailing_ai)] if trailing_ai else []
        return []

    def after_agent(self, state: AgentState, runtime: Runtime) -> dict | None:
        thread_id = runtime.context.get("thread_id") if runtime.context else None
        if not thread_id:
            return None

        turns = self._collect_latest_exchange(state.get("messages", []))
        if turns:
            self._archive.append_turns(
                thread_id=thread_id,
                agent_name=self._agent_name,
                turns=turns,
            )
        return None
