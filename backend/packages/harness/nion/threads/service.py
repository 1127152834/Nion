from __future__ import annotations

import re
import threading
from collections.abc import Generator
from datetime import UTC, datetime
from typing import Any

from nion.client import NionClient, StreamEvent
from nion.config.agents_config import AGENT_NAME_PATTERN
from nion.memory.evidence_capture.service import resolve_optional_bool
from nion.notebook.service import NotebookNotFoundError, NotebookService

from .models import (
    ThreadCliManagementState,
    ThreadRecord,
    ThreadSearchParams,
    ThreadStreamRequest,
)
from .repository import ThreadRepository
from .title_policy import is_placeholder_thread_title, resolve_preferred_thread_title
from .title_generation import generate_thread_title_in_background


class ThreadBusyError(RuntimeError):
    """Raised when a thread already has an active run in progress."""


_active_thread_run_ids: set[str] = set()
_active_thread_run_ids_lock = threading.Lock()


def _claim_thread_run(thread_id: str) -> None:
    with _active_thread_run_ids_lock:
        if thread_id in _active_thread_run_ids:
            raise ThreadBusyError(
                f"Thread '{thread_id}' already has an active run in progress."
            )
        _active_thread_run_ids.add(thread_id)


def _release_thread_run(thread_id: str) -> None:
    with _active_thread_run_ids_lock:
        _active_thread_run_ids.discard(thread_id)


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
            scope=params.scope,
            limit=params.limit,
            offset=params.offset,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )

    def get_or_create_notebook_assistant_session(
        self,
        *,
        note_id: str,
        session_id: str,
    ) -> tuple[ThreadRecord, bool]:
        thread_id = self._repository.notebook_assistant_thread_id(
            note_id=note_id,
            session_id=session_id,
        )
        existing = self._repository.get_thread(thread_id)
        if existing is not None:
            return existing, False

        created = self._repository.upsert_thread(
            thread_id,
            title="Notebook Assistant",
            values={
                "scope": "notebook_assistant",
                "note_id": note_id,
                "notebook_session_id": session_id,
            },
        )
        return created, True

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
        _claim_thread_run(thread_id)
        human_payload = _extract_human_message_payload(request.messages)
        message_text = _extract_message_text(request.messages)
        context = dict(request.context)
        config = request.config
        latest_values: dict[str, Any] | None = None
        existing_record = self._repository.get_thread(thread_id)
        existing_title = existing_record.values.title if existing_record is not None else None
        try:
            context.setdefault("thread_id", thread_id)
            if request.assistant_id and "agent_name" not in context:
                normalized_agent_name = _normalize_assistant_id_to_agent_name(request.assistant_id)
                if normalized_agent_name is not None:
                    context["agent_name"] = normalized_agent_name

            notebook_context = _build_notebook_runtime_context(context)

            selected_cli_tools = _extract_selected_cli_tools(request.messages)
            cli_tools_enabled = self._should_enable_cli_tools_for_request(
                message_text,
                thread_id=thread_id,
                selected_cli_tools=selected_cli_tools,
            )

            for event in self._client.stream(
                message_text,
                thread_id=thread_id,
                human_message_payload=human_payload,
                model_name=context.get("model_name"),
                thinking_enabled=bool(context.get("thinking_enabled", True)),
                plan_mode=bool(context.get("is_plan_mode", False)),
                subagent_enabled=bool(context.get("subagent_enabled", False)),
                cli_tools_enabled=cli_tools_enabled,
                requested_skills=context.get("requested_skills", []),
                selected_mcp_tools=context.get("selected_mcp_tools", []),
                selected_cli_tools=selected_cli_tools,
                agent_name=context.get("agent_name"),
                recursion_limit=config.get("recursion_limit", 100),
                surface=context.get("surface", "workspace"),
                notebook_context=notebook_context,
                execution_mode=context.get("execution_mode"),
                host_workdir=context.get("host_workdir"),
                session_mode=context.get("session_mode"),
                memory_read=resolve_optional_bool(
                    context.get("memory_read"),
                    default=True,
                ),
                memory_write=resolve_optional_bool(
                    context.get("memory_write"),
                    default=context.get("session_mode") != "temporary_chat",
                ),
                project_id=context.get("project_id"),
                project_phase=context.get("project_phase"),
                primary_plan_id=context.get("primary_plan_id"),
            ):
                if event.type == "values":
                    incoming_title = event.data.get("title")
                    resolved_title = resolve_preferred_thread_title(
                        current_title=existing_title,
                        incoming_title=incoming_title if isinstance(incoming_title, str) else None,
                    )
                    latest_values = {
                        "title": resolved_title or "Untitled",
                        "messages": event.data.get("messages", []),
                        "artifacts": event.data.get("artifacts", []),
                    }
                    existing_title = latest_values["title"]
                    event.data["title"] = latest_values["title"]
                yield event

            if latest_values is not None:
                latest_values["cli_management"] = self._next_cli_management_state(
                    message_text=message_text,
                    cli_tools_enabled=cli_tools_enabled,
                    previous_state=self._get_cli_management_state(thread_id),
                ).model_dump()
                if context.get("project_id"):
                    latest_values["project"] = {
                        "source": "project",
                        "project_id": str(context.get("project_id")),
                        "project_name": str(
                            context.get("project_name")
                            or latest_values.get("project", {}).get("project_name")
                            or "Project"
                        ),
                        "project_phase": context.get("project_phase"),
                        "primary_plan_id": context.get("primary_plan_id"),
                        "inherit_project_context": True,
                    }
                persisted = self._repository.upsert_thread(
                    thread_id,
                    agent_name=str(context.get("agent_name") or "lead_agent"),
                    values=latest_values,
                )
                self._queue_title_generation(
                    thread_id=thread_id,
                    values=persisted.values.model_dump(),
                    context=context,
                )
        finally:
            _release_thread_run(thread_id)

    def _queue_title_generation(
        self,
        *,
        thread_id: str,
        values: dict[str, Any],
        context: dict[str, Any],
    ) -> None:
        generate_thread_title_in_background(
            thread_id=thread_id,
            values=values,
            context=context,
            apply_title=self._apply_generated_title,
        )

    def _apply_generated_title(
        self,
        thread_id: str,
        title: str,
        context: dict[str, Any],
    ) -> None:
        existing = self._repository.get_thread(thread_id)
        if existing is None:
            return

        current_title = existing.values.title.strip()
        if not is_placeholder_thread_title(current_title):
            return

        self._repository.update_state(thread_id, {"title": title})

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


def _normalize_assistant_id_to_agent_name(assistant_id: str | None) -> str | None:
    if assistant_id is None:
        return None
    normalized = assistant_id.strip().lower()
    if not normalized or normalized == "lead_agent":
        return None
    if not AGENT_NAME_PATTERN.match(normalized):
        return None
    return normalized


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


def _build_notebook_runtime_context(context: dict[str, Any]) -> dict[str, Any] | None:
    if context.get("agent_name") != "notebook-chat":
        return None

    note_id = context.get("notebook_note_id")
    if not isinstance(note_id, str) or not note_id.strip():
        return {
            "note_id": "",
            "note_title": "",
            "note_relative_path": "",
            "note_body": "",
            "selection_text": "",
            "selection_start": None,
            "selection_end": None,
            "session_id": context.get("notebook_session_id"),
        }

    try:
        note = NotebookService().read_note(note_id)
    except NotebookNotFoundError:
        return {
            "note_id": note_id,
            "note_title": str(context.get("notebook_note_title") or ""),
            "note_relative_path": "",
            "note_body": "",
            "selection_text": "",
            "selection_start": None,
            "selection_end": None,
            "session_id": context.get("notebook_session_id"),
        }

    return {
        "note_id": note.note_id,
        "note_title": note.title,
        "note_relative_path": note.relative_path,
        "note_body": note.body,
        "selection_text": str(context.get("selection_text") or ""),
        "selection_start": context.get("selection_start"),
        "selection_end": context.get("selection_end"),
        "session_id": context.get("notebook_session_id"),
    }


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
