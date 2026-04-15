"""NionClient — Embedded Python client for Nion agent system.

Provides direct programmatic access to Nion's agent capabilities
without requiring LangGraph Server or Gateway API processes.

Usage:
    from nion.client import NionClient

    client = NionClient()
    response = client.chat("Analyze this paper for me", thread_id="my-thread")
    print(response)

    # Streaming
    for event in client.stream("hello"):
        print(event)
"""

import asyncio
import json
import logging
import mimetypes
import os
import re
import shutil
import tempfile
import uuid
import zipfile
from collections.abc import Generator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig

from nion.agents.lead_agent.agent import _build_middlewares
from nion.agents.lead_agent.prompt import apply_prompt_template
from nion.agents.thread_state import ThreadState
from nion.capability_bridge_actions import build_capability_bridge_actions, execute_capability_bridge_action
from nion.config.agents_config import AGENT_NAME_PATTERN
from nion.config.app_config import get_app_config
from nion.config.extensions_config import ExtensionsConfig, SkillStateConfig, get_extensions_config, reload_extensions_config
from nion.config.paths import get_paths
from nion.memory.evidence_capture.service import capture_turn_evidence, resolve_optional_bool
from nion.model_management.service import get_model_registry_service
from nion.models import create_chat_model
from nion.system_capability_catalog import build_system_capability_catalog
from nion.telemetry.logger import make_event
from nion.telemetry.store import TelemetryStore
from nion.telemetry.token_source import iter_with_token_source
from nion.tools.activity_summary import summarize_tool_batch
from nion.uploads import (
    PathTraversalError,
    delete_file_safe,
    ensure_uploads_dir,
    normalize_filename,
    upload_artifact_url,
    upload_virtual_path,
)

logger = logging.getLogger(__name__)


def _record_agent_event(
    *,
    event_type: str,
    thread_id: str,
    message: str,
    level: str = "info",
    details: dict[str, Any] | None = None,
) -> None:
    try:
        TelemetryStore(get_paths().telemetry_db_file).record_event(
            make_event(
                category="agent",
                level=level,  # type: ignore[arg-type]
                event_type=event_type,
                actor="agent",
                thread_id=thread_id,
                message=message,
                details=details or {},
            )
        )
    except Exception:
        logger.warning("Failed to record agent event %s", event_type, exc_info=True)


def _build_tool_activity_summary_event(
    *,
    index: int,
    thread_id: str,
    tool_names: list[str],
) -> dict[str, Any]:
    summary = summarize_tool_batch(tool_names)
    group_id = f"group-{index}"
    return {
        "event_id": f"activity-{index}",
        "kind": "tool_batch_summary",
        "group_id": group_id,
        "thread_id": thread_id,
        "summary_label": summary.summary_label,
        "result_class": summary.result_class,
        "tool_names": tool_names,
    }


def _build_tool_activity_summary_message(
    *,
    index: int,
    event: dict[str, Any],
) -> dict[str, Any]:
    return {
        "type": "tool_activity_summary",
        "id": f"tas-{index}",
        "content": event["summary_label"],
        "additional_kwargs": {
            "group_id": event["group_id"],
            "tool_names": event["tool_names"],
            "result_class": event["result_class"],
        },
    }


@dataclass
class StreamEvent:
    """A single event from the streaming agent response.

    Event types align with the LangGraph SSE protocol:
        - ``"values"``: Full state snapshot (title, messages, artifacts).
        - ``"messages-tuple"``: Per-message update (AI text, tool calls, tool results).
        - ``"end"``: Stream finished.

    Attributes:
        type: Event type.
        data: Event payload. Contents vary by type.
    """

    type: str
    data: dict[str, Any] = field(default_factory=dict)


class NionClient:
    """Embedded Python client for Nion agent system.

    Provides direct programmatic access to Nion's agent capabilities
    without requiring LangGraph Server or Gateway API processes.

    Note:
        Multi-turn conversations require a ``checkpointer``. Without one,
        each ``stream()`` / ``chat()`` call is stateless — ``thread_id``
        is only used for file isolation (uploads / artifacts).

        The system prompt (including date, memory, and skills context) is
        generated when the internal agent is first created and cached until
        the configuration key changes. Call :meth:`reset_agent` to force
        a refresh in long-running processes.

    Example::

        from nion.client import NionClient

        client = NionClient()

        # Simple one-shot
        print(client.chat("hello"))

        # Streaming
        for event in client.stream("hello"):
            print(event.type, event.data)

        # Configuration queries
        print(client.list_models())
        print(client.list_skills())
    """

    def __init__(
        self,
        checkpointer=None,
        *,
        model_name: str | None = None,
        thinking_enabled: bool = True,
        subagent_enabled: bool = False,
        plan_mode: bool = False,
        agent_name: str | None = None,
    ):
        """Initialize the client.

        Loads configuration but defers agent creation to first use.

        Args:
            checkpointer: LangGraph checkpointer instance for state persistence.
                Required for multi-turn conversations on the same thread_id.
                Without a checkpointer, each call is stateless.
            model_name: Override the default model name from config.
            thinking_enabled: Enable model's extended thinking.
            subagent_enabled: Enable subagent delegation.
            plan_mode: Enable TodoList middleware for plan mode.
            agent_name: Name of the agent to use.
        """
        self._app_config = get_app_config()

        if agent_name is not None and not AGENT_NAME_PATTERN.match(agent_name):
            raise ValueError(f"Invalid agent name '{agent_name}'. Must match pattern: {AGENT_NAME_PATTERN.pattern}")

        self._checkpointer = checkpointer
        self._model_name = model_name
        self._thinking_enabled = thinking_enabled
        self._subagent_enabled = subagent_enabled
        self._plan_mode = plan_mode
        self._agent_name = agent_name

        # Lazy agent — created on first call, recreated when config changes.
        self._agent = None
        self._agent_config_key: tuple | None = None

    def reset_agent(self) -> None:
        """Force the internal agent to be recreated on the next call.

        Use this after external changes (e.g. memory updates, skill
        installations) that should be reflected in the system prompt
        or tool set.
        """
        self._agent = None
        self._agent_config_key = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _atomic_write_json(path: Path, data: dict) -> None:
        """Write JSON to *path* atomically (temp file + replace)."""
        fd = tempfile.NamedTemporaryFile(
            mode="w",
            dir=path.parent,
            suffix=".tmp",
            delete=False,
        )
        try:
            json.dump(data, fd, indent=2)
            fd.close()
            Path(fd.name).replace(path)
        except BaseException:
            fd.close()
            Path(fd.name).unlink(missing_ok=True)
            raise

    def _get_runnable_config(self, thread_id: str, **overrides) -> RunnableConfig:
        """Build a RunnableConfig for agent invocation."""
        effective_agent_name = overrides.get("agent_name", self._agent_name)
        configurable = {
            "thread_id": thread_id,
            "agent_name": effective_agent_name,
            "model_name": overrides.get("model_name", self._model_name),
            "thinking_enabled": overrides.get("thinking_enabled", self._thinking_enabled),
            "is_plan_mode": overrides.get("plan_mode", self._plan_mode),
            "subagent_enabled": overrides.get("subagent_enabled", self._subagent_enabled),
            "cli_tools_enabled": overrides.get("cli_tools_enabled", False),
            "requested_skills": overrides.get("requested_skills", []),
            "include_mcp": overrides.get("include_mcp", True),
            "selected_mcp_tools": overrides.get("selected_mcp_tools", []),
            "selected_cli_tools": overrides.get("selected_cli_tools", []),
            "tool_groups_override": overrides.get("tool_groups_override"),
            "additional_system_prompt": overrides.get("additional_system_prompt"),
            "surface": overrides.get("surface", "workspace"),
            "notebook_context": overrides.get("notebook_context"),
            "session_mode": overrides.get("session_mode"),
            "memory_read": overrides.get("memory_read", True),
            "memory_write": overrides.get("memory_write"),
            "locale": overrides.get("locale"),
        }
        return RunnableConfig(
            configurable=configurable,
            recursion_limit=overrides.get("recursion_limit", 100),
        )

    @staticmethod
    def _build_agent_config_key(configurable: dict[str, Any]) -> tuple:
        return (
            configurable.get("agent_name"),
            configurable.get("model_name"),
            configurable.get("thinking_enabled"),
            configurable.get("is_plan_mode"),
            configurable.get("subagent_enabled"),
            configurable.get("cli_tools_enabled"),
            tuple(configurable.get("requested_skills") or []),
            configurable.get("include_mcp", True),
            tuple(configurable.get("selected_mcp_tools") or []),
            tuple(configurable.get("selected_cli_tools") or []),
            tuple(configurable.get("tool_groups_override") or []),
            configurable.get("additional_system_prompt"),
            configurable.get("surface"),
            json.dumps(configurable.get("notebook_context") or {}, sort_keys=True, ensure_ascii=False),
            configurable.get("session_mode"),
            configurable.get("memory_read", True),
            configurable.get("memory_write"),
        )

    def _ensure_agent(self, config: RunnableConfig):
        """Create (or recreate) the agent when config-dependent params change."""
        cfg = config.get("configurable", {})
        key = self._build_agent_config_key(cfg)

        if self._agent is not None and self._agent_config_key == key:
            return

        effective_agent_name = cfg.get("agent_name") or self._agent_name
        thinking_enabled = cfg.get("thinking_enabled", True)
        model_name = cfg.get("model_name")
        subagent_enabled = cfg.get("subagent_enabled", False)
        cli_tools_enabled = cfg.get("cli_tools_enabled", False)
        requested_skills = cfg.get("requested_skills") or []
        include_mcp = cfg.get("include_mcp", True)
        selected_mcp_tools = cfg.get("selected_mcp_tools") or []
        selected_cli_tools = cfg.get("selected_cli_tools") or []
        tool_groups_override = cfg.get("tool_groups_override")
        additional_system_prompt = cfg.get("additional_system_prompt")
        surface = cfg.get("surface", "workspace")
        notebook_context = cfg.get("notebook_context")
        max_concurrent_subagents = cfg.get("max_concurrent_subagents", 3)

        kwargs: dict[str, Any] = {
            "model": create_chat_model(name=model_name, thinking_enabled=thinking_enabled),
            "tools": self._get_tools(
                model_name=model_name,
                groups=tool_groups_override,
                include_mcp=include_mcp,
                subagent_enabled=subagent_enabled,
                cli_tools_enabled=cli_tools_enabled,
                surface=surface,
            ),
            "middleware": _build_middlewares(config, model_name=model_name, agent_name=effective_agent_name),
            "system_prompt": apply_prompt_template(
                subagent_enabled=subagent_enabled,
                cli_tools_enabled=cli_tools_enabled,
                requested_skills=requested_skills,
                selected_mcp_tools=selected_mcp_tools,
                selected_cli_tools=selected_cli_tools,
                notebook_context=notebook_context,
                max_concurrent_subagents=max_concurrent_subagents,
                agent_name=effective_agent_name,
                thread_id=str(cfg.get("thread_id") or ""),
                memory_read=resolve_optional_bool(
                    cfg.get("memory_read"),
                    default=True,
                ),
            )
            + (
                f"\n\n<delegated_runtime_overlay>\n{additional_system_prompt}\n</delegated_runtime_overlay>"
                if isinstance(additional_system_prompt, str) and additional_system_prompt.strip()
                else ""
            ),
            "state_schema": ThreadState,
        }
        checkpointer = self._checkpointer
        if checkpointer is None:
            from nion.agents.checkpointer import get_checkpointer

            checkpointer = get_checkpointer()
        if checkpointer is not None:
            kwargs["checkpointer"] = checkpointer

        self._agent = create_agent(**kwargs)
        self._agent_config_key = key
        _record_agent_event(
            event_type="agent_created",
            thread_id=str(cfg.get("thread_id") or "unknown"),
            message=f"Created embedded agent '{effective_agent_name or 'lead_agent'}'",
            details={
                "agent_name": effective_agent_name or "lead_agent",
                "model_name": model_name,
                "thinking_enabled": thinking_enabled,
                "subagent_enabled": subagent_enabled,
                "cli_tools_enabled": cli_tools_enabled,
                "requested_skills": requested_skills,
                "include_mcp": include_mcp,
                "selected_mcp_tools": selected_mcp_tools,
                "selected_cli_tools": selected_cli_tools,
                "tool_groups_override": tool_groups_override,
                "additional_system_prompt": additional_system_prompt,
                "surface": surface,
            },
        )
        logger.info("Agent created: agent_name=%s, model=%s, thinking=%s", effective_agent_name, model_name, thinking_enabled)

    @staticmethod
    def _get_tools(
        *,
        model_name: str | None,
        groups: list[str] | None = None,
        include_mcp: bool = True,
        subagent_enabled: bool,
        cli_tools_enabled: bool = False,
        surface: str = "workspace",
    ):
        """Lazy import to avoid circular dependency at module level."""
        from nion.tools import get_available_tools

        return get_available_tools(
            model_name=model_name,
            groups=groups,
            include_mcp=include_mcp,
            subagent_enabled=subagent_enabled,
            cli_tools_enabled=cli_tools_enabled,
            surface=surface,
        )

    @staticmethod
    def _serialize_message(msg) -> dict:
        """Serialize a LangChain message to a plain dict for values events."""
        if isinstance(msg, AIMessage):
            d: dict[str, Any] = {"type": "ai", "content": msg.content, "id": getattr(msg, "id", None)}
            if msg.tool_calls:
                d["tool_calls"] = [{"name": tc["name"], "args": tc["args"], "id": tc.get("id")} for tc in msg.tool_calls]
            if getattr(msg, "usage_metadata", None):
                d["usage_metadata"] = msg.usage_metadata
            return d
        if isinstance(msg, ToolMessage):
            payload = {
                "type": "tool",
                "content": NionClient._extract_text(msg.content),
                "name": getattr(msg, "name", None),
                "tool_call_id": getattr(msg, "tool_call_id", None),
                "id": getattr(msg, "id", None),
            }
            additional_kwargs = getattr(msg, "additional_kwargs", None)
            if additional_kwargs:
                payload["additional_kwargs"] = additional_kwargs
            return payload
        if isinstance(msg, HumanMessage):
            payload = {"type": "human", "content": msg.content, "id": getattr(msg, "id", None)}
            additional_kwargs = getattr(msg, "additional_kwargs", None)
            if additional_kwargs:
                payload["additional_kwargs"] = additional_kwargs
            return payload
        if isinstance(msg, SystemMessage):
            return {"type": "system", "content": msg.content, "id": getattr(msg, "id", None)}
        return {"type": "unknown", "content": str(msg), "id": getattr(msg, "id", None)}

    @staticmethod
    def _attach_assistant_knowledge(
        serialized_message: dict[str, Any],
        *,
        knowledge_attachment: dict[str, Any] | None,
        knowledge_page_ids: list[str],
    ) -> dict[str, Any]:
        if serialized_message.get("type") != "ai" or not serialized_message.get("content"):
            return serialized_message

        additional_kwargs = serialized_message.get("additional_kwargs")
        merged_additional_kwargs = dict(additional_kwargs) if isinstance(additional_kwargs, dict) else {}

        if knowledge_attachment:
            merged_additional_kwargs["knowledge"] = knowledge_attachment
        elif knowledge_page_ids:
            merged_additional_kwargs["knowledge_sources"] = knowledge_page_ids

        if not merged_additional_kwargs:
            return serialized_message

        return {
            **serialized_message,
            "additional_kwargs": merged_additional_kwargs,
        }

    @staticmethod
    def _take_pending_knowledge_for_assistant(
        serialized_message: dict[str, Any],
        *,
        pending_knowledge_attachment: dict[str, Any] | None,
        pending_knowledge_page_ids: list[str],
        bound_knowledge_attachment: dict[str, Any] | None,
        bound_knowledge_page_ids: list[str],
        bound_knowledge_message_key: str | None,
    ) -> tuple[
        dict[str, Any],
        dict[str, Any] | None,
        list[str],
        dict[str, Any] | None,
        list[str],
        str | None,
    ]:
        if serialized_message.get("type") != "ai" or not serialized_message.get("content"):
            return (
                serialized_message,
                pending_knowledge_attachment,
                pending_knowledge_page_ids,
                bound_knowledge_attachment,
                bound_knowledge_page_ids,
                bound_knowledge_message_key,
            )

        message_key = NionClient._message_dedup_key(serialized_message)
        if (
            bound_knowledge_message_key is None
            and (pending_knowledge_attachment or pending_knowledge_page_ids)
        ):
            bound_knowledge_message_key = message_key
            bound_knowledge_attachment = pending_knowledge_attachment
            bound_knowledge_page_ids = pending_knowledge_page_ids
            pending_knowledge_attachment = None
            pending_knowledge_page_ids = []

        if (
            bound_knowledge_message_key
            and bound_knowledge_message_key == message_key
            and (bound_knowledge_attachment or bound_knowledge_page_ids)
        ):
            serialized_message = NionClient._attach_assistant_knowledge(
                serialized_message,
                knowledge_attachment=bound_knowledge_attachment,
                knowledge_page_ids=bound_knowledge_page_ids,
            )

        return (
            serialized_message,
            pending_knowledge_attachment,
            pending_knowledge_page_ids,
            bound_knowledge_attachment,
            bound_knowledge_page_ids,
            bound_knowledge_message_key,
        )

    @staticmethod
    def _serialize_values_messages(
        messages: list[Any],
        *,
        knowledge_attachment: dict[str, Any] | None,
        knowledge_page_ids: list[str],
        knowledge_message_key: str | None,
    ) -> list[dict[str, Any]]:
        serialized_messages = [NionClient._serialize_message(message) for message in messages]
        if not serialized_messages:
            return serialized_messages

        if not knowledge_message_key:
            return serialized_messages

        for index, serialized_message in enumerate(serialized_messages):
            if NionClient._message_dedup_key(serialized_message) != knowledge_message_key:
                continue
            serialized_messages[index] = NionClient._attach_assistant_knowledge(
                serialized_message,
                knowledge_attachment=knowledge_attachment,
                knowledge_page_ids=knowledge_page_ids,
            )
            break
        return serialized_messages

    @staticmethod
    def _extract_text(content) -> str:
        """Extract plain text from AIMessage content (str or list of blocks).

        String chunks are concatenated without separators to avoid corrupting
        token/character deltas or chunked JSON payloads. Dict-based text blocks
        are treated as full text blocks and joined with newlines to preserve
        readability.
        """
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            if content and all(isinstance(block, str) for block in content):
                chunk_like = len(content) > 1 and all(
                    isinstance(block, str)
                    and len(block) <= 20
                    and any(ch in block for ch in '{}[]":,')
                    for block in content
                )
                return "".join(content) if chunk_like else "\n".join(content)

            pieces: list[str] = []
            pending_str_parts: list[str] = []

            def flush_pending_str_parts() -> None:
                if pending_str_parts:
                    pieces.append("".join(pending_str_parts))
                    pending_str_parts.clear()

            for block in content:
                if isinstance(block, str):
                    pending_str_parts.append(block)
                elif isinstance(block, dict):
                    flush_pending_str_parts()
                    text_val = block.get("text")
                    if isinstance(text_val, str):
                        pieces.append(text_val)

            flush_pending_str_parts()
            return "\n".join(pieces) if pieces else ""
        return str(content)

    @staticmethod
    def _collect_latest_human_ai_messages(
        messages: list[Any],
        *,
        knowledge_attachment: dict[str, Any] | None = None,
        knowledge_page_ids: list[str] | None = None,
        knowledge_message_key: str | None = None,
    ) -> list[dict[str, Any]]:
        latest_exchange: list[dict[str, Any]] = []
        for msg in reversed(messages):
            if not isinstance(msg, HumanMessage | AIMessage):
                continue
            serialized_message = NionClient._serialize_message(msg)
            if serialized_message.get("type") == "ai" and serialized_message.get("content"):
                if (
                    knowledge_message_key
                    and NionClient._message_dedup_key(serialized_message) == knowledge_message_key
                ):
                    serialized_message = NionClient._attach_assistant_knowledge(
                        serialized_message,
                        knowledge_attachment=knowledge_attachment,
                        knowledge_page_ids=knowledge_page_ids or [],
                    )
                latest_exchange.append(serialized_message)
                continue
            if serialized_message.get("type") == "human" and serialized_message.get("content"):
                latest_exchange.append(serialized_message)
                return list(reversed(latest_exchange))
        return []

    @staticmethod
    def _message_dedup_key(serialized_message: dict[str, Any]) -> str:
        message_id = serialized_message.get("id")
        if isinstance(message_id, str) and message_id:
            return f"id:{message_id}"
        return "sig:" + json.dumps(
            serialized_message,
            sort_keys=True,
            ensure_ascii=False,
        )

    # ------------------------------------------------------------------
    # Public API — conversation
    # ------------------------------------------------------------------

    def stream(
        self,
        message: str,
        *,
        thread_id: str | None = None,
        human_message_payload: dict[str, Any] | None = None,
        **kwargs,
    ) -> Generator[StreamEvent, None, None]:
        """Stream a conversation turn, yielding events incrementally.

        Each call sends one user message and yields events until the agent
        finishes its turn. A ``checkpointer`` must be provided at init time
        for multi-turn context to be preserved across calls.

        Event types align with the LangGraph SSE protocol so that
        consumers can switch between HTTP streaming and embedded mode
        without changing their event-handling logic.

        Args:
            message: User message text.
            thread_id: Thread ID for conversation context. Auto-generated if None.
            **kwargs: Override client defaults (model_name, thinking_enabled,
                plan_mode, subagent_enabled, recursion_limit).

        Yields:
            StreamEvent with one of:
            - type="values"          data={"title": str|None, "messages": [...], "artifacts": [...]}
            - type="custom"          data={...}
            - type="messages-tuple"  data={"type": "ai", "content": str, "id": str}
            - type="messages-tuple"  data={"type": "ai", "content": str, "id": str, "usage_metadata": {...}}
            - type="messages-tuple"  data={"type": "ai", "content": "", "id": str, "tool_calls": [...]}
            - type="messages-tuple"  data={"type": "tool", "content": str, "name": str, "tool_call_id": str, "id": str}
            - type="end"             data={"usage": {"input_tokens": int, "output_tokens": int, "total_tokens": int}}
        """
        if thread_id is None:
            thread_id = str(uuid.uuid4())

        config = self._get_runnable_config(thread_id, **kwargs)
        configurable = config.get("configurable", {})
        _record_agent_event(
            event_type="agent_model_selected",
            thread_id=thread_id,
            message=f"Selected model for embedded agent thread '{thread_id}'",
            details={
                "agent_name": configurable.get("agent_name") or self._agent_name or "lead_agent",
                "model_name": configurable.get("model_name"),
                "thinking_enabled": configurable.get("thinking_enabled"),
                "subagent_enabled": configurable.get("subagent_enabled"),
                "surface": configurable.get("surface"),
            },
        )
        self._ensure_agent(config)
        _record_agent_event(
            event_type="agent_run_started",
            thread_id=thread_id,
            message=f"Started embedded agent run for thread '{thread_id}'",
            details={
                "agent_name": configurable.get("agent_name") or self._agent_name or "lead_agent",
                "model_name": config.get("configurable", {}).get("model_name"),
            },
        )

        human_payload = human_message_payload or {}
        human_content = human_payload.get("content", message)
        human_additional_kwargs = human_payload.get("additional_kwargs")
        human_message_kwargs: dict[str, Any] = {
            "content": human_content,
        }
        if isinstance(human_additional_kwargs, dict):
            human_message_kwargs["additional_kwargs"] = human_additional_kwargs

        state: dict[str, Any] = {
            "messages": [HumanMessage(**human_message_kwargs)]
        }
        context = {"thread_id": thread_id}
        effective_agent_name = configurable.get("agent_name") or self._agent_name
        if effective_agent_name:
            context["agent_name"] = effective_agent_name
        if "execution_mode" in kwargs:
            context["execution_mode"] = kwargs.get("execution_mode")
        if "host_workdir" in kwargs:
            context["host_workdir"] = kwargs.get("host_workdir")
        if "locale" in kwargs:
            context["locale"] = kwargs.get("locale")

        seen_signatures: dict[str, str] = {}
        cumulative_ai_content: dict[str, str] = {}
        cumulative_usage: dict[str, int] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        current_tool_batch: list[dict[str, Any]] = []
        tool_activity_timeline: list[dict[str, Any]] = []
        tool_activity_messages: list[dict[str, Any]] = []
        new_turn_messages: list[dict[str, Any]] = []
        initial_turn_candidate_messages: list[dict[str, Any]] = []
        latest_values_messages: list[Any] = []
        pending_knowledge_page_ids: list[str] = []
        pending_knowledge_attachment: dict[str, Any] | None = None
        bound_knowledge_page_ids: list[str] = []
        bound_knowledge_attachment: dict[str, Any] | None = None
        bound_knowledge_message_key: str | None = None
        values_chunk_count = 0

        def flush_tool_batch() -> list[StreamEvent]:
            nonlocal current_tool_batch, tool_activity_timeline
            if not current_tool_batch:
                return []

            tool_names = [item["tool_name"] for item in current_tool_batch]
            activity_index = len(tool_activity_timeline) + 1
            activity_event = _build_tool_activity_summary_event(
                index=activity_index,
                thread_id=thread_id,
                tool_names=tool_names,
            )
            tool_activity_timeline.append(activity_event)
            current_tool_batch = []

            message_projection = _build_tool_activity_summary_message(
                index=activity_index,
                event=activity_event,
            )
            tool_activity_messages.append(message_projection)

            return [
                StreamEvent(type="tool-activity", data=activity_event),
                StreamEvent(type="messages-tuple", data=message_projection),
            ]

        try:
            ai_message_count = 0
            agent_stream = self._agent.stream(
                state,
                config=config,
                context=context,
                stream_mode=["values", "messages", "custom"],
            )
            for raw_chunk in iter_with_token_source("lead_agent", agent_stream):
                stream_mode = "values"
                chunk = raw_chunk
                if (
                    isinstance(raw_chunk, tuple)
                    and len(raw_chunk) == 2
                    and isinstance(raw_chunk[0], str)
                ):
                    stream_mode = raw_chunk[0]
                    chunk = raw_chunk[1]

                if str(stream_mode) == "custom":
                    yield StreamEvent(type="custom", data=chunk)
                    continue

                if stream_mode == "messages":
                    if (
                        isinstance(chunk, tuple)
                        and len(chunk) == 2
                        and isinstance(chunk[0], AIMessageChunk)
                    ):
                        message_chunk, metadata = chunk
                        msg_id = getattr(message_chunk, "id", None)
                        text = self._extract_text(message_chunk.content)
                        if text and msg_id:
                            cumulative_text = cumulative_ai_content.get(msg_id, "") + text
                            cumulative_ai_content[msg_id] = cumulative_text
                            payload: dict[str, Any] = {
                                "type": "ai",
                                "content": cumulative_text,
                                "id": msg_id,
                            }
                            if isinstance(metadata, dict) and metadata:
                                payload["response_metadata"] = metadata
                            yield StreamEvent(type="messages-tuple", data=payload)
                    continue

                if stream_mode != "values" or not isinstance(chunk, dict):
                    continue

                messages = chunk.get("messages", [])
                latest_values_messages = messages
                values_chunk_count += 1

                for index, msg in enumerate(messages):
                    serialized_message = self._serialize_message(msg)
                    if index == len(messages) - 1:
                        (
                            serialized_message,
                            pending_knowledge_attachment,
                            pending_knowledge_page_ids,
                            bound_knowledge_attachment,
                            bound_knowledge_page_ids,
                            bound_knowledge_message_key,
                        ) = self._take_pending_knowledge_for_assistant(
                            serialized_message,
                            pending_knowledge_attachment=pending_knowledge_attachment,
                            pending_knowledge_page_ids=pending_knowledge_page_ids,
                            bound_knowledge_attachment=bound_knowledge_attachment,
                            bound_knowledge_page_ids=bound_knowledge_page_ids,
                            bound_knowledge_message_key=bound_knowledge_message_key,
                        )
                    signature = json.dumps(
                        serialized_message,
                        sort_keys=True,
                        ensure_ascii=False,
                    )
                    msg_id = getattr(msg, "id", None)
                    dedup_key = (
                        f"id:{msg_id}"
                        if isinstance(msg_id, str) and msg_id
                        else self._message_dedup_key(serialized_message)
                    )
                    if seen_signatures.get(dedup_key) == signature:
                        continue

                    if isinstance(msg, AIMessage):
                        usage = getattr(msg, "usage_metadata", None)
                        text = self._extract_text(msg.content)
                        if (
                            isinstance(msg_id, str)
                            and msg_id
                            and text
                            and not msg.tool_calls
                            and not usage
                            and cumulative_ai_content.get(msg_id) == text
                        ):
                            seen_signatures[dedup_key] = signature
                            continue

                        ai_message_count += 1
                        if usage:
                            cumulative_usage["input_tokens"] += usage.get("input_tokens", 0) or 0
                            cumulative_usage["output_tokens"] += usage.get("output_tokens", 0) or 0
                            cumulative_usage["total_tokens"] += usage.get("total_tokens", 0) or 0

                        if msg.tool_calls:
                            yield StreamEvent(
                                type="messages-tuple",
                                data={
                                    "type": "ai",
                                    "content": "",
                                    "id": msg_id,
                                    "tool_calls": [
                                        {"name": tc["name"], "args": tc["args"], "id": tc.get("id")}
                                        for tc in msg.tool_calls
                                    ],
                                },
                            )

                        if text:
                            new_turn_messages.append(serialized_message)
                            if msg_id:
                                cumulative_ai_content[msg_id] = text
                            event_data: dict[str, Any] = {
                                key: value
                                for key, value in serialized_message.items()
                                if key in {"type", "content", "id", "additional_kwargs"}
                            }
                            event_data["content"] = text
                            if usage:
                                event_data["usage_metadata"] = {
                                    "input_tokens": usage.get("input_tokens", 0) or 0,
                                    "output_tokens": usage.get("output_tokens", 0) or 0,
                                    "total_tokens": usage.get("total_tokens", 0) or 0,
                                }
                            yield StreamEvent(type="messages-tuple", data=event_data)
                        seen_signatures[dedup_key] = signature
                    elif isinstance(msg, HumanMessage):
                        if serialized_message.get("content"):
                            new_turn_messages.append(serialized_message)
                        seen_signatures[dedup_key] = signature

                    elif isinstance(msg, ToolMessage):
                        additional_kwargs = getattr(msg, "additional_kwargs", None) or {}
                        if getattr(msg, "name", None) == "query_knowledge_base":
                            try:
                                tool_payload = json.loads(self._extract_text(msg.content) or "{}")
                                page_ids = tool_payload.get("page_ids")
                                if isinstance(page_ids, list):
                                    pending_knowledge_page_ids = [
                                        item for item in page_ids if isinstance(item, str)
                                    ]
                                pending_knowledge_attachment = {
                                    "citations": tool_payload.get("citations", []),
                                    "matched_page_ids": tool_payload.get("matched_page_ids", []),
                                    "retrieval_policy": tool_payload.get("retrieval_policy"),
                                    "warnings": tool_payload.get("warnings", []),
                                    "rendered_from_final_answer": True,
                                }
                            except json.JSONDecodeError:
                                pending_knowledge_page_ids = []
                                pending_knowledge_attachment = None
                        payload: dict[str, Any] = {
                            "type": "tool",
                            "content": self._extract_text(msg.content),
                            "name": getattr(msg, "name", None),
                            "tool_call_id": getattr(msg, "tool_call_id", None),
                            "id": msg_id,
                        }
                        if additional_kwargs:
                            payload["additional_kwargs"] = additional_kwargs
                        yield StreamEvent(type="messages-tuple", data=payload)
                        current_tool_batch.append(
                            {
                                "tool_name": getattr(msg, "name", None) or "unknown_tool",
                                "tool_call_id": getattr(msg, "tool_call_id", None),
                            }
                        )

                        clarification = additional_kwargs.get("clarification")
                        if getattr(msg, "name", None) == "ask_clarification" and isinstance(clarification, dict):
                            yield StreamEvent(
                                type="custom",
                                data={
                                    "type": "clarification_request",
                                    "id": msg_id,
                                    "tool_call_id": getattr(msg, "tool_call_id", None),
                                    **clarification,
                                },
                            )

                        permission_request = additional_kwargs.get("permission_request")
                        if getattr(msg, "name", None) == "permission_request" and isinstance(permission_request, dict):
                            yield StreamEvent(
                                type="custom",
                                data={
                                    "type": "permission_request",
                                    "id": msg_id,
                                    "tool_call_id": getattr(msg, "tool_call_id", None),
                                    **permission_request,
                                },
                            )
                        seen_signatures[dedup_key] = signature

                yield from flush_tool_batch()

                serialized_values_messages = self._serialize_values_messages(
                    messages,
                    knowledge_attachment=bound_knowledge_attachment,
                    knowledge_page_ids=bound_knowledge_page_ids,
                    knowledge_message_key=bound_knowledge_message_key,
                )
                yield StreamEvent(
                    type="values",
                    data={
                        "title": chunk.get("title"),
                        "messages": [
                            *serialized_values_messages,
                            *tool_activity_messages,
                        ],
                        "artifacts": chunk.get("artifacts", []),
                        "todos": chunk.get("todos", []),
                        "tool_activity_timeline": tool_activity_timeline,
                        "latest_tool_activity": tool_activity_timeline[-1] if tool_activity_timeline else None,
                    },
                )

                if values_chunk_count == 1 and not initial_turn_candidate_messages:
                    initial_turn_candidate_messages = self._collect_latest_human_ai_messages(
                        messages,
                        knowledge_attachment=bound_knowledge_attachment,
                        knowledge_page_ids=bound_knowledge_page_ids,
                        knowledge_message_key=bound_knowledge_message_key,
                    )

            final_turn_messages = self._collect_latest_human_ai_messages(
                latest_values_messages,
                knowledge_attachment=bound_knowledge_attachment,
                knowledge_page_ids=bound_knowledge_page_ids,
                knowledge_message_key=bound_knowledge_message_key,
            )
            if final_turn_messages:
                new_turn_messages = final_turn_messages
            elif not new_turn_messages:
                new_turn_messages = initial_turn_candidate_messages
            elif (
                initial_turn_candidate_messages
                and initial_turn_candidate_messages[0].get("type") == "human"
                and all(message.get("type") != "human" for message in new_turn_messages)
            ):
                known_keys = {
                    self._message_dedup_key(message) for message in new_turn_messages
                }
                prefixed_messages = [
                    message
                    for message in initial_turn_candidate_messages
                    if self._message_dedup_key(message) not in known_keys
                ]
                new_turn_messages = [*prefixed_messages, *new_turn_messages]
            capture_turn_evidence(
                thread_id=thread_id,
                turn_id=f"turn:{uuid.uuid4().hex}",
                messages=new_turn_messages,
                session_mode=configurable.get("session_mode"),
                memory_read=resolve_optional_bool(
                    configurable.get("memory_read"),
                    default=True,
                ),
                memory_write=resolve_optional_bool(
                    configurable.get("memory_write"),
                    default=configurable.get("session_mode") != "temporary_chat",
                ),
            )
            _record_agent_event(
                event_type="agent_run_completed",
                thread_id=thread_id,
                message=f"Completed embedded agent run for thread '{thread_id}'",
                details={
                    "ai_message_count": ai_message_count,
                    "usage": cumulative_usage,
                },
            )
            yield StreamEvent(type="end", data={"usage": cumulative_usage})
        except Exception as exc:
            _record_agent_event(
                event_type="agent_run_failed",
                thread_id=thread_id,
                message=f"Embedded agent run failed for thread '{thread_id}'",
                level="error",
                details={"reason": str(exc)},
            )
            raise

    def chat(self, message: str, *, thread_id: str | None = None, **kwargs) -> str:
        """Send a message and return the final text response.

        Convenience wrapper around :meth:`stream` that returns only the
        **last** AI text from ``messages-tuple`` events. If the agent emits
        multiple text segments in one turn, intermediate segments are
        discarded. Use :meth:`stream` directly to capture all events.

        Args:
            message: User message text.
            thread_id: Thread ID for conversation context. Auto-generated if None.
            **kwargs: Override client defaults (same as stream()).

        Returns:
            The last AI message text, or empty string if no response.
        """
        last_text = ""
        for event in self.stream(message, thread_id=thread_id, **kwargs):
            if event.type == "messages-tuple" and event.data.get("type") == "ai":
                content = event.data.get("content", "")
                if content:
                    last_text = content
        return last_text

    # ------------------------------------------------------------------
    # Public API — configuration queries
    # ------------------------------------------------------------------

    def list_models(self) -> dict:
        """List available runtime models from the registry.

        Returns:
            Dict with "models" key containing list of model info dicts,
            matching the Gateway API ``ModelsListResponse`` schema.
        """
        registry = get_model_registry_service(app_config_provider=lambda: self._app_config)
        return {
            "models": [
                {
                    "name": model.runtime_name,
                    "model": model.model.model_id,
                    "display_name": model.model.display_name,
                    "description": model.runtime_model_config.description,
                    "supports_thinking": model.runtime_model_config.supports_thinking,
                    "supports_reasoning_effort": model.runtime_model_config.supports_reasoning_effort,
                    "supports_vision": model.runtime_model_config.supports_vision,
                }
                for model in registry.list_runtime_models()
            ]
        }

    def list_skills(self, enabled_only: bool = False) -> dict:
        """List available skills.

        Args:
            enabled_only: If True, only return enabled skills.

        Returns:
            Dict with "skills" key containing list of skill info dicts,
            matching the Gateway API ``SkillsListResponse`` schema.
        """
        from nion.skills.loader import load_skills

        return {
            "skills": [
                {
                    "id": f"{s.category}:{s.skill_path.replace('/', '::')}",
                    "name": s.name,
                    "description": s.description,
                    "license": s.license,
                    "category": s.category,
                    "enabled": s.enabled,
                }
                for s in load_skills(enabled_only=enabled_only)
            ]
        }

    def get_system_capability_catalog(self) -> dict:
        from nion.config.agents_config import list_agent_catalog
        from nion.config.extensions_config import ExtensionsConfig
        from nion.memory_os.compat import get_memory_os_config
        from nion.notebook.service import NotebookService
        from nion.skills.loader import load_skills

        try:
            extensions_config = ExtensionsConfig.from_file()
            mcp_servers = [
                {
                    "name": name,
                    "description": server.description.strip(),
                    "type": server.type,
                    "enabled": server.enabled,
                }
                for name, server in extensions_config.get_enabled_mcp_servers().items()
                if isinstance(server.description, str) and server.description.strip()
            ]
        except Exception:
            mcp_servers = []

        skills = load_skills(enabled_only=True)
        agents = list_agent_catalog()
        notebook = NotebookService()
        note_summaries = notebook.list_note_summaries()
        inbox_items = notebook.list_inbox_items()

        return build_system_capability_catalog(
            cli_tools_enabled=True,
            skill_count=len(skills),
            mcp_servers=mcp_servers,
            agent_count=len(agents),
            memory_descriptor={
                "runtime_backend": "memory_os",
                **get_memory_os_config(),
            },
            notebook_descriptor={
                "root_directory": str(notebook._paths.notebook_root_dir),
                "note_count": len(note_summaries),
                "inbox_count": len(inbox_items),
                "assistant_available": True,
            },
            agent_descriptors=[
                {
                    "id": agent.id,
                    "name": agent.name,
                    "kind": agent.kind,
                    "entrypoint": agent.entrypoint,
                    "tool_policy": agent.tool_policy,
                    "visibility": agent.visibility,
                }
                for agent in agents
            ],
            skill_descriptors=[
                {
                    "name": skill.name,
                    "category": skill.category,
                    "user_invocable": getattr(skill, "user_invocable", False),
                    "hooks": getattr(skill, "hooks", []) or [],
                    "model": getattr(skill, "model", None),
                    "effort": getattr(skill, "effort", None),
                }
                for skill in skills
            ],
        )

    def get_capability_actions(self) -> dict:
        return {"actions": build_capability_bridge_actions()}

    def execute_capability_action(self, action_id: str, payload: dict) -> dict:
        return execute_capability_bridge_action(action_id, payload)

    def get_memory(self) -> dict:
        """Get current memory data.

        Returns:
            Memory data dict (see src/agents/memory/updater.py for structure).
        """
        from nion.memory_os.compat import build_canonical_memory_payload

        return build_canonical_memory_payload()

    def get_model(self, name: str) -> dict | None:
        """Get a specific runtime model configuration by name.

        Args:
            name: Model name.

        Returns:
            Model info dict matching the Gateway API ``ModelResponse``
            schema, or None if not found.
        """
        registry = get_model_registry_service(app_config_provider=lambda: self._app_config)
        try:
            model = registry.resolve_model(name)
        except ValueError:
            return None
        return {
            "name": model.runtime_name,
            "model": model.model.model_id,
            "display_name": model.model.display_name,
            "description": model.runtime_model_config.description,
            "supports_thinking": model.runtime_model_config.supports_thinking,
            "supports_reasoning_effort": model.runtime_model_config.supports_reasoning_effort,
            "supports_vision": model.runtime_model_config.supports_vision,
        }

    # ------------------------------------------------------------------
    # Public API — MCP configuration
    # ------------------------------------------------------------------

    def get_mcp_config(self) -> dict:
        """Get MCP server configurations.

        Returns:
            Dict with "mcp_servers" key mapping server name to config,
            matching the Gateway API ``McpConfigResponse`` schema.
        """
        config = get_extensions_config()
        return {"mcp_servers": {name: server.model_dump() for name, server in config.mcp_servers.items()}}

    def update_mcp_config(self, mcp_servers: dict[str, dict]) -> dict:
        """Update MCP server configurations.

        Writes to extensions_config.json and reloads the cache.

        Args:
            mcp_servers: Dict mapping server name to config dict.
                Each value should contain keys like enabled, type, command, args, env, url, etc.

        Returns:
            Dict with "mcp_servers" key, matching the Gateway API
            ``McpConfigResponse`` schema.

        Raises:
            OSError: If the config file cannot be written.
        """
        config_path = ExtensionsConfig.resolve_config_path()
        if config_path is None:
            raise FileNotFoundError("Cannot locate extensions_config.json. Set NION_EXTENSIONS_CONFIG_PATH or ensure it exists in the project root.")

        current_config = get_extensions_config()

        config_data = {
            "mcpServers": mcp_servers,
            "skills": {name: {"enabled": skill.enabled} for name, skill in current_config.skills.items()},
        }

        self._atomic_write_json(config_path, config_data)

        self._agent = None
        reloaded = reload_extensions_config()
        return {"mcp_servers": {name: server.model_dump() for name, server in reloaded.mcp_servers.items()}}

    # ------------------------------------------------------------------
    # Public API — skills management
    # ------------------------------------------------------------------

    def get_skill(self, name: str) -> dict | None:
        """Get a specific skill by name.

        Args:
            name: Skill name.

        Returns:
            Skill info dict, or None if not found.
        """
        from nion.skills.loader import load_skills

        skill = next((s for s in load_skills(enabled_only=False) if s.name == name), None)
        if skill is None:
            return None
        return {
            "id": f"{skill.category}:{skill.skill_path.replace('/', '::')}",
            "name": skill.name,
            "description": skill.description,
            "license": skill.license,
            "category": skill.category,
            "enabled": skill.enabled,
        }

    def update_skill(self, name: str, *, enabled: bool) -> dict:
        """Update a skill's enabled status.

        Args:
            name: Skill name.
            enabled: New enabled status.

        Returns:
            Updated skill info dict.

        Raises:
            ValueError: If the skill is not found.
            OSError: If the config file cannot be written.
        """
        from nion.skills.loader import load_skills

        skills = load_skills(enabled_only=False)
        skill = next((s for s in skills if s.name == name), None)
        if skill is None:
            raise ValueError(f"Skill '{name}' not found")

        config_path = ExtensionsConfig.resolve_config_path()
        if config_path is None:
            raise FileNotFoundError("Cannot locate extensions_config.json. Set NION_EXTENSIONS_CONFIG_PATH or ensure it exists in the project root.")

        extensions_config = get_extensions_config()
        extensions_config.skills[name] = SkillStateConfig(enabled=enabled)

        config_data = {
            "mcpServers": {n: s.model_dump() for n, s in extensions_config.mcp_servers.items()},
            "skills": {n: {"enabled": sc.enabled} for n, sc in extensions_config.skills.items()},
        }

        self._atomic_write_json(config_path, config_data)

        self._agent = None
        reload_extensions_config()

        updated = next((s for s in load_skills(enabled_only=False) if s.name == name), None)
        if updated is None:
            raise RuntimeError(f"Skill '{name}' disappeared after update")
        return {
            "name": updated.name,
            "description": updated.description,
            "license": updated.license,
            "category": updated.category,
            "enabled": updated.enabled,
        }

    def install_skill(self, skill_path: str | Path) -> dict:
        """Install a skill from a .skill archive (ZIP).

        Args:
            skill_path: Path to the .skill file.

        Returns:
            Dict with success, skill_name, message.

        Raises:
            FileNotFoundError: If the file does not exist.
            ValueError: If the file is invalid.
        """
        from nion.skills.loader import get_skills_root_path
        from nion.skills.validation import _validate_skill_frontmatter

        path = Path(skill_path)
        if not path.exists():
            raise FileNotFoundError(f"Skill file not found: {skill_path}")
        if not path.is_file():
            raise ValueError(f"Path is not a file: {skill_path}")
        if path.suffix != ".skill":
            raise ValueError("File must have .skill extension")
        if not zipfile.is_zipfile(path):
            raise ValueError("File is not a valid ZIP archive")

        skills_root = get_skills_root_path()
        custom_dir = skills_root / "custom"
        custom_dir.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            with zipfile.ZipFile(path, "r") as zf:
                total_size = sum(info.file_size for info in zf.infolist())
                if total_size > 100 * 1024 * 1024:
                    raise ValueError("Skill archive too large when extracted (>100MB)")
                for info in zf.infolist():
                    if Path(info.filename).is_absolute() or ".." in Path(info.filename).parts:
                        raise ValueError(f"Unsafe path in archive: {info.filename}")
                zf.extractall(tmp_path)
            for p in tmp_path.rglob("*"):
                if p.is_symlink():
                    p.unlink()

            items = list(tmp_path.iterdir())
            if not items:
                raise ValueError("Skill archive is empty")

            skill_dir = items[0] if len(items) == 1 and items[0].is_dir() else tmp_path

            is_valid, message, skill_name = _validate_skill_frontmatter(skill_dir)
            if not is_valid:
                raise ValueError(f"Invalid skill: {message}")
            if not re.fullmatch(r"[a-zA-Z0-9_-]+", skill_name):
                raise ValueError(f"Invalid skill name: {skill_name}")

            target = custom_dir / skill_name
            if target.exists():
                raise ValueError(f"Skill '{skill_name}' already exists")

            shutil.copytree(skill_dir, target)

        return {"success": True, "skill_name": skill_name, "message": f"Skill '{skill_name}' installed successfully"}

    # ------------------------------------------------------------------
    # Public API — memory management
    # ------------------------------------------------------------------

    def reload_memory(self) -> dict:
        """Reload memory data from file, forcing cache invalidation.

        Returns:
            The reloaded memory data dict.
        """
        from nion.memory_os.compat import build_canonical_memory_payload

        return build_canonical_memory_payload()

    def clear_memory(self) -> dict:
        """Clear persisted memory data and return the empty payload."""
        from nion.memory_os.compat import clear_memory_os_memory

        return clear_memory_os_memory()

    def export_memory(self) -> dict:
        """Export current memory data for backup or transfer."""
        from nion.memory_os.compat import build_legacy_memory_view

        return build_legacy_memory_view()

    def import_memory(self, memory_data: dict) -> dict:
        """Import and persist full memory data."""
        from nion.memory_os.compat import import_legacy_memory_into_memory_os

        return import_legacy_memory_into_memory_os(memory_data)

    def create_memory_fact(self, content: str, category: str = "context", confidence: float = 0.5) -> dict:
        """Create a single fact manually."""
        from nion.memory_os.compat import create_memory_os_fact

        return create_memory_os_fact(content=content, category=category, confidence=confidence)

    def delete_memory_fact(self, fact_id: str) -> dict:
        """Delete a single persisted memory fact and return updated memory."""
        from nion.memory_os.compat import delete_memory_os_fact

        return delete_memory_os_fact(fact_id)

    def update_memory_fact(
        self,
        fact_id: str,
        content: str | None = None,
        category: str | None = None,
        confidence: float | None = None,
    ) -> dict:
        """Update a single fact manually, preserving omitted fields."""

        from nion.memory_os.compat import update_memory_os_fact

        return update_memory_os_fact(
            fact_id=fact_id,
            content=content,
            category=category,
            confidence=confidence,
        )

    def get_memory_config(self) -> dict:
        """Get memory system configuration.

        Returns:
            Memory config dict.
        """
        from nion.memory_os.compat import get_memory_os_config

        return get_memory_os_config()

    def get_memory_status(self) -> dict:
        """Get memory status: config + current data.

        Returns:
            Dict with "config" and "data" keys.
        """
        from nion.memory_os.compat import build_memory_user_facing_payload

        return {
            "config": self.get_memory_config(),
            "data": build_memory_user_facing_payload(),
        }

    # ------------------------------------------------------------------
    # Public API — file uploads
    # ------------------------------------------------------------------

    @staticmethod
    def _get_uploads_dir(thread_id: str) -> Path:
        """Get (and create) the uploads directory for a thread."""
        return ensure_uploads_dir(thread_id)

    def upload_files(self, thread_id: str, files: list[str | Path]) -> dict:
        """Upload local files into a thread's uploads directory.

        For PDF, PPT, Excel, and Word files, they are also converted to Markdown.

        Args:
            thread_id: Target thread ID.
            files: List of local file paths to upload.

        Returns:
            Dict with success, files, message — matching the Gateway API
            ``UploadResponse`` schema.

        Raises:
            FileNotFoundError: If any file does not exist.
            ValueError: If any supplied path exists but is not a regular file.
        """
        from nion.utils.file_conversion import CONVERTIBLE_EXTENSIONS, convert_file_to_markdown

        # Validate all files upfront to avoid partial uploads.
        resolved_files = []
        convertible_extensions = {ext.lower() for ext in CONVERTIBLE_EXTENSIONS}
        has_convertible_file = False
        for f in files:
            p = Path(f)
            if not p.exists():
                raise FileNotFoundError(f"File not found: {f}")
            if not p.is_file():
                raise ValueError(f"Path is not a file: {f}")
            resolved_files.append(p)
            if not has_convertible_file and p.suffix.lower() in convertible_extensions:
                has_convertible_file = True

        uploads_dir = self._get_uploads_dir(thread_id)
        uploaded_files: list[dict] = []

        conversion_pool = None
        if has_convertible_file:
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                conversion_pool = None
            else:
                import concurrent.futures

                # Reuse one worker when already inside an event loop to avoid
                # creating a new ThreadPoolExecutor per converted file.
                conversion_pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)

        def _convert_in_thread(path: Path):
            return asyncio.run(convert_file_to_markdown(path))

        try:
            for src_path in resolved_files:
                safe_filename = normalize_filename(src_path.name)
                dest = uploads_dir / safe_filename
                shutil.copy2(src_path, dest)

                info: dict[str, Any] = {
                    "filename": safe_filename,
                    "size": str(dest.stat().st_size),
                    "path": str(dest),
                    "virtual_path": upload_virtual_path(safe_filename),
                    "artifact_url": upload_artifact_url(thread_id, safe_filename),
                }

                if src_path.suffix.lower() in convertible_extensions:
                    try:
                        if conversion_pool is not None:
                            md_path = conversion_pool.submit(_convert_in_thread, dest).result()
                        else:
                            md_path = asyncio.run(convert_file_to_markdown(dest))
                    except Exception:
                        logger.warning(
                            "Failed to convert %s to markdown",
                            src_path.name,
                            exc_info=True,
                        )
                        md_path = None

                    if md_path is not None:
                        info["markdown_file"] = md_path.name
                        info["markdown_virtual_path"] = upload_virtual_path(md_path.name)
                        info["markdown_artifact_url"] = upload_artifact_url(thread_id, md_path.name)

                uploaded_files.append(info)
        finally:
            if conversion_pool is not None:
                conversion_pool.shutdown(wait=True)

        return {
            "success": True,
            "files": uploaded_files,
            "message": f"Successfully uploaded {len(uploaded_files)} file(s)",
        }

    def list_uploads(self, thread_id: str) -> dict:
        """List files in a thread's uploads directory.

        Args:
            thread_id: Thread ID.

        Returns:
            Dict with "files" and "count" keys, matching the Gateway API
            ``list_uploaded_files`` response.
        """
        uploads_dir = self._get_uploads_dir(thread_id)
        if not uploads_dir.exists():
            return {"files": [], "count": 0}

        files = []
        with os.scandir(uploads_dir) as entries:
            file_entries = [entry for entry in entries if entry.is_file()]

        for entry in sorted(file_entries, key=lambda item: item.name):
            stat = entry.stat()
            filename = entry.name
            files.append(
                {
                    "filename": filename,
                    "size": str(stat.st_size),
                    "path": str(Path(entry.path)),
                    "virtual_path": upload_virtual_path(filename),
                    "artifact_url": upload_artifact_url(thread_id, filename),
                    "extension": Path(filename).suffix,
                    "modified": stat.st_mtime,
                }
            )
        return {"files": files, "count": len(files)}

    def delete_upload(self, thread_id: str, filename: str) -> dict:
        """Delete a file from a thread's uploads directory.

        Args:
            thread_id: Thread ID.
            filename: Filename to delete.

        Returns:
            Dict with success and message, matching the Gateway API
            ``delete_uploaded_file`` response.

        Raises:
            FileNotFoundError: If the file does not exist.
            PermissionError: If path traversal is detected.
        """
        uploads_dir = self._get_uploads_dir(thread_id)
        try:
            file_path = delete_file_safe(uploads_dir, filename)
        except PathTraversalError as exc:
            raise PermissionError(str(exc)) from exc

        companion_markdown = file_path.with_suffix(".md")
        companion_markdown.unlink(missing_ok=True)
        return {"success": True, "message": f"Deleted {filename}"}

    # ------------------------------------------------------------------
    # Public API — artifacts
    # ------------------------------------------------------------------

    def get_artifact(self, thread_id: str, path: str) -> tuple[bytes, str]:
        """Read an artifact file produced by the agent.

        Args:
            thread_id: Thread ID.
            path: Virtual path (e.g. "mnt/user-data/outputs/file.txt").

        Returns:
            Tuple of (file_bytes, mime_type).

        Raises:
            FileNotFoundError: If the artifact does not exist.
            ValueError: If the path is invalid.
        """
        virtual_prefix = "mnt/user-data"
        clean_path = path.lstrip("/")
        if not clean_path.startswith(virtual_prefix):
            raise ValueError(f"Path must start with /{virtual_prefix}")

        relative = clean_path[len(virtual_prefix) :].lstrip("/")
        base_dir = get_paths().sandbox_user_data_dir(thread_id)
        actual = (base_dir / relative).resolve()

        try:
            actual.relative_to(base_dir.resolve())
        except ValueError as exc:
            raise PermissionError("Access denied: path traversal detected") from exc
        if not actual.exists():
            raise FileNotFoundError(f"Artifact not found: {path}")
        if not actual.is_file():
            raise ValueError(f"Path is not a file: {path}")

        mime_type, _ = mimetypes.guess_type(actual)
        return actual.read_bytes(), mime_type or "application/octet-stream"
