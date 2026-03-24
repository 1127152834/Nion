from __future__ import annotations

import json
from collections.abc import Generator
from typing import Any

from nion.client import NionClient, StreamEvent

from .models import ThreadSearchParams, ThreadStreamRequest
from .repository import ThreadRepository


class ThreadService:
    def __init__(
        self,
        *,
        repository: ThreadRepository | None = None,
        client: NionClient | None = None,
    ) -> None:
        self._repository = repository or ThreadRepository()
        self._client = client or NionClient()

    def search(self, params: ThreadSearchParams) -> list[dict[str, Any]]:
        return self._repository.search(
            limit=params.limit,
            offset=params.offset,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )

    def get_state(self, thread_id: str) -> dict[str, Any]:
        record = self._repository.get_thread(thread_id)
        if record is None:
            record = self._repository.upsert_thread(thread_id)
        return record.model_dump()

    def update_state(self, thread_id: str, values: dict[str, Any]) -> dict[str, Any]:
        return self._repository.update_state(thread_id, values).model_dump()

    def delete_thread(self, thread_id: str) -> None:
        self._repository.delete_thread(thread_id)

    def stream(
        self,
        thread_id: str,
        request: ThreadStreamRequest,
    ) -> Generator[StreamEvent, None, None]:
        message_text = _extract_message_text(request.messages)
        context = request.context
        config = request.config
        latest_values: dict[str, Any] | None = None

        for event in self._client.stream(
            message_text,
            thread_id=thread_id,
            model_name=context.get("model_name"),
            thinking_enabled=bool(context.get("thinking_enabled", True)),
            plan_mode=bool(context.get("is_plan_mode", False)),
            subagent_enabled=bool(context.get("subagent_enabled", False)),
            agent_name=context.get("agent_name"),
            recursion_limit=config.get("recursion_limit", 100),
            surface=context.get("surface", "workspace"),
        ):
            if event.type == "values":
                latest_values = {
                    "title": event.data.get("title") or "Untitled",
                    "messages": event.data.get("messages", []),
                    "artifacts": event.data.get("artifacts", []),
                }
            yield event

        if latest_values is not None:
            self._repository.upsert_thread(
                thread_id,
                agent_name=str(context.get("agent_name") or "lead_agent"),
                values=latest_values,
            )


def _extract_message_text(messages: list[dict[str, Any]]) -> str:
    if not messages:
        return ""

    first = messages[0]
    content = first.get("content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                text = part.get("text")
                if isinstance(text, str):
                    text_parts.append(text)
        return "\n".join(text_parts)
    return str(content)


_thread_service: ThreadService | None = None


def create_default_thread_service() -> ThreadService:
    global _thread_service
    if _thread_service is None:
        _thread_service = ThreadService()
    return _thread_service
