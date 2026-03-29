from __future__ import annotations

import json
import re
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
            thread_id=params.thread_id,
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

        selected_cli_tools = _extract_selected_cli_tools(request.messages)
        cli_tools_enabled = self._should_enable_cli_tools_for_request(
            message_text,
            thread_id=thread_id,
            selected_cli_tools=selected_cli_tools,
        )
        if selected_cli_tools:
            message_text = (
                f"{message_text}\n\n<selected_cli_tools>\n"
                f"Prefer using these CLI tools when they are relevant to the task: "
                f"{', '.join(selected_cli_tools)}.\n"
                f"</selected_cli_tools>"
            ).strip()

        for event in self._client.stream(
            message_text,
            thread_id=thread_id,
            model_name=context.get("model_name"),
            thinking_enabled=bool(context.get("thinking_enabled", True)),
            plan_mode=bool(context.get("is_plan_mode", False)),
            subagent_enabled=bool(context.get("subagent_enabled", False)),
            cli_tools_enabled=cli_tools_enabled,
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

    def _should_enable_cli_tools_for_request(
        self,
        message_text: str,
        *,
        thread_id: str,
        selected_cli_tools: list[str] | None = None,
    ) -> bool:
        if should_enable_cli_tools_for_request(
            message_text,
            selected_cli_tools=selected_cli_tools,
        ):
            return True

        record = self._repository.get_thread(thread_id)
        if record is None:
            return False

        return _thread_history_has_cli_tools_intent(record.values.messages)


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


def _extract_selected_cli_tools(messages: list[dict[str, Any]]) -> list[str]:
    if not messages:
        return []
    first = messages[0]
    additional_kwargs = first.get("additional_kwargs", {})
    if not isinstance(additional_kwargs, dict):
        return []
    shortcut_selections = additional_kwargs.get("shortcut_selections", {})
    if not isinstance(shortcut_selections, dict):
        return []
    cli_tools = shortcut_selections.get("cliTools", [])
    if not isinstance(cli_tools, list):
        return []
    return [item for item in cli_tools if isinstance(item, str) and item.strip()]


_CLI_TOOLS_INTENT_PATTERNS = [
    r"\bcli tool(s)?\b",
    r"\btool library\b",
    r"\bcodepilot_cli_tools_[a-z_]+\b",
    r"\b(?:install|uninstall|remove|add|update|upgrade|check)\b.{0,40}\b(?:cli|tool|tools)\b",
    r"\b(?:brew|pipx|pip3?|npm|cargo|apt(?:-get)?)\s+(?:install|uninstall|remove|update|upgrade)\b",
    r"(?:CLI工具|CLI 工具|工具库)",
    r"(?:安装|卸载|删除|添加|更新|升级|检查).{0,12}(?:CLI|工具)",
    r"(?:帮我装|帮我安装|帮我更新|帮我升级).{0,12}(?:CLI|工具)?",
]


def should_enable_cli_tools_for_request(
    message_text: str,
    *,
    selected_cli_tools: list[str] | None = None,
) -> bool:
    if selected_cli_tools:
        return True

    normalized = message_text.strip()
    if not normalized:
        return False

    return any(
        re.search(pattern, normalized, flags=re.IGNORECASE) is not None
        for pattern in _CLI_TOOLS_INTENT_PATTERNS
    )


def _thread_history_has_cli_tools_intent(messages: list[dict[str, Any]]) -> bool:
    for message in reversed(messages):
        content = message.get("content", "")
        text = _message_text_from_history_content(content)
        if not text:
            continue
        if should_enable_cli_tools_for_request(text):
            return True
    return False


def _message_text_from_history_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts)
    return ""


_thread_service: ThreadService | None = None


def create_default_thread_service() -> ThreadService:
    global _thread_service
    if _thread_service is None:
        _thread_service = ThreadService()
    return _thread_service
