from __future__ import annotations

import json
import re
from collections.abc import Generator
from datetime import UTC, datetime
from typing import Any

from nion.client import NionClient, StreamEvent

from .models import ThreadCliManagementState, ThreadSearchParams, ThreadStreamRequest
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
        human_payload = _extract_human_message_payload(request.messages)
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
            human_payload["content"] = message_text

        for event in self._client.stream(
            message_text,
            thread_id=thread_id,
            human_message_payload=human_payload,
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
            latest_values["cli_management"] = self._next_cli_management_state(
                message_text=message_text,
                cli_tools_enabled=cli_tools_enabled,
                previous_state=self._get_cli_management_state(thread_id),
            ).model_dump()
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

        cli_management = record.values.cli_management
        if cli_management.phase == "awaiting_permission":
            return True
        if cli_management.active and cli_management.followup_turns_remaining > 0:
            return True

        return False

    def _get_cli_management_state(self, thread_id: str) -> ThreadCliManagementState:
        record = self._repository.get_thread(thread_id)
        if record is None:
            return ThreadCliManagementState()
        return record.values.cli_management

    def _next_cli_management_state(
        self,
        *,
        message_text: str,
        cli_tools_enabled: bool,
        previous_state: ThreadCliManagementState,
    ) -> ThreadCliManagementState:
        now = datetime.now(UTC).isoformat()
        if cli_tools_enabled:
            return ThreadCliManagementState(
                active=True,
                phase="managing",
                last_trigger="selected_cli_or_cli_intent",
                last_intent=_infer_cli_intent(message_text),
                followup_turns_remaining=2,
                updated_at=now,
            )

        if previous_state.phase == "awaiting_permission":
            return ThreadCliManagementState(
                active=True,
                phase="awaiting_permission",
                last_trigger=previous_state.last_trigger or "follow_up",
                last_intent=previous_state.last_intent,
                pending_permission_request_id=previous_state.pending_permission_request_id,
                followup_turns_remaining=previous_state.followup_turns_remaining,
                updated_at=now,
            )

        if previous_state.active and previous_state.followup_turns_remaining > 0:
            return ThreadCliManagementState(
                active=True,
                phase="managing",
                last_trigger=previous_state.last_trigger or "follow_up",
                last_intent=previous_state.last_intent,
                pending_permission_request_id=None,
                followup_turns_remaining=max(previous_state.followup_turns_remaining - 1, 0),
                updated_at=now,
            )

        return ThreadCliManagementState(
            active=False,
            phase="inactive",
            last_trigger="exited",
            last_intent=previous_state.last_intent,
            pending_permission_request_id=None,
            followup_turns_remaining=0,
            updated_at=now,
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


def _extract_human_message_payload(messages: list[dict[str, Any]]) -> dict[str, Any]:
    if not messages:
        return {"content": "", "additional_kwargs": {}}

    first = messages[0]
    content = first.get("content", "")
    additional_kwargs = first.get("additional_kwargs", {})
    return {
        "content": content,
        "additional_kwargs": additional_kwargs if isinstance(additional_kwargs, dict) else {},
    }


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


def _infer_cli_intent(message_text: str) -> str:
    normalized = message_text.strip().lower()
    if "install" in normalized or "安装" in normalized:
        return "install"
    if "update" in normalized or "upgrade" in normalized or "更新" in normalized or "升级" in normalized:
        return "update"
    if "remove" in normalized or "卸载" in normalized or "删除" in normalized:
        return "remove"
    if "add" in normalized or "添加" in normalized:
        return "add"
    return "manage"


_thread_service: ThreadService | None = None


def create_default_thread_service() -> ThreadService:
    global _thread_service
    if _thread_service is None:
        _thread_service = ThreadService()
    return _thread_service
