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
from nion.automation.event_dispatch import dispatch_automation_event
from nion.config.agents_config import AGENT_NAME_PATTERN
from nion.config.app_config import get_app_config
from nion.config.extensions_config import ExtensionsConfig, SkillStateConfig, get_extensions_config, reload_extensions_config
from nion.config.paths import get_paths
from nion.model_management.service import get_model_registry_service
from nion.models import create_chat_model
from nion.telemetry.logger import make_event
from nion.telemetry.store import TelemetryStore
from nion.telemetry.token_source import token_source_context
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
        configurable = {
            "thread_id": thread_id,
            "model_name": overrides.get("model_name", self._model_name),
            "thinking_enabled": overrides.get("thinking_enabled", self._thinking_enabled),
            "is_plan_mode": overrides.get("plan_mode", self._plan_mode),
            "subagent_enabled": overrides.get("subagent_enabled", self._subagent_enabled),
            "cli_tools_enabled": overrides.get("cli_tools_enabled", False),
            "surface": overrides.get("surface", "workspace"),
        }
        return RunnableConfig(
            configurable=configurable,
            recursion_limit=overrides.get("recursion_limit", 100),
        )

    def _ensure_agent(self, config: RunnableConfig):
        """Create (or recreate) the agent when config-dependent params change."""
        cfg = config.get("configurable", {})
        key = (
            cfg.get("model_name"),
            cfg.get("thinking_enabled"),
            cfg.get("is_plan_mode"),
            cfg.get("subagent_enabled"),
            cfg.get("cli_tools_enabled"),
            cfg.get("surface"),
        )

        if self._agent is not None and self._agent_config_key == key:
            return

        thinking_enabled = cfg.get("thinking_enabled", True)
        model_name = cfg.get("model_name")
        subagent_enabled = cfg.get("subagent_enabled", False)
        cli_tools_enabled = cfg.get("cli_tools_enabled", False)
        surface = cfg.get("surface", "workspace")
        max_concurrent_subagents = cfg.get("max_concurrent_subagents", 3)

        kwargs: dict[str, Any] = {
            "model": create_chat_model(name=model_name, thinking_enabled=thinking_enabled),
            "tools": self._get_tools(
                model_name=model_name,
                subagent_enabled=subagent_enabled,
                cli_tools_enabled=cli_tools_enabled,
                surface=surface,
            ),
            "middleware": _build_middlewares(config, model_name=model_name, agent_name=self._agent_name),
            "system_prompt": apply_prompt_template(
                subagent_enabled=subagent_enabled,
                cli_tools_enabled=cli_tools_enabled,
                max_concurrent_subagents=max_concurrent_subagents,
                agent_name=self._agent_name,
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
            message=f"Created embedded agent '{self._agent_name or 'lead_agent'}'",
            details={
                "agent_name": self._agent_name or "lead_agent",
                "model_name": model_name,
                "thinking_enabled": thinking_enabled,
                "subagent_enabled": subagent_enabled,
                "cli_tools_enabled": cli_tools_enabled,
                "surface": surface,
            },
        )
        logger.info("Agent created: agent_name=%s, model=%s, thinking=%s", self._agent_name, model_name, thinking_enabled)

    @staticmethod
    def _get_tools(
        *,
        model_name: str | None,
        subagent_enabled: bool,
        cli_tools_enabled: bool = False,
        surface: str = "workspace",
    ):
        """Lazy import to avoid circular dependency at module level."""
        from nion.tools import get_available_tools

        return get_available_tools(
            model_name=model_name,
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
            return {"type": "human", "content": msg.content, "id": getattr(msg, "id", None)}
        if isinstance(msg, SystemMessage):
            return {"type": "system", "content": msg.content, "id": getattr(msg, "id", None)}
        return {"type": "unknown", "content": str(msg), "id": getattr(msg, "id", None)}

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
                "agent_name": self._agent_name or "lead_agent",
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
                "agent_name": self._agent_name or "lead_agent",
                "model_name": config.get("configurable", {}).get("model_name"),
                "surface": configurable.get("surface"),
            },
        )

        human_payload = human_message_payload or {}
        human_content = human_payload.get("content", message)
        human_additional_kwargs = human_payload.get("additional_kwargs")
        state: dict[str, Any] = {
            "messages": [
                HumanMessage(
                    content=human_content,
                    additional_kwargs=human_additional_kwargs
                    if isinstance(human_additional_kwargs, dict)
                    else None,
                )
            ]
        }
        context = {"thread_id": thread_id}
        if self._agent_name:
            context["agent_name"] = self._agent_name

        seen_signatures: dict[str, str] = {}
        cumulative_ai_content: dict[str, str] = {}
        cumulative_usage: dict[str, int] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

        try:
            ai_message_count = 0
            with token_source_context("lead_agent"):
                for raw_chunk in self._agent.stream(
                    state,
                    config=config,
                    context=context,
                    stream_mode=["values", "messages", "custom"],
                ):
                    stream_mode = "values"
                    chunk = raw_chunk
                    if (
                        isinstance(raw_chunk, tuple)
                        and len(raw_chunk) == 2
                        and isinstance(raw_chunk[0], str)
                    ):
                        stream_mode = raw_chunk[0]
                        chunk = raw_chunk[1]

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
                                yield StreamEvent(
                                    type="messages-tuple",
                                    data={
                                        "type": "ai",
                                        "content": cumulative_text,
                                        "id": msg_id,
                                        **(
                                            {"response_metadata": metadata}
                                            if isinstance(metadata, dict) and metadata
                                            else {}
                                        ),
                                    },
                                )
                        continue

                    if stream_mode != "values" or not isinstance(chunk, dict):
                        continue

                    messages = chunk.get("messages", [])

                    for msg in messages:
                        msg_id = getattr(msg, "id", None)
                        if msg_id:
                            signature = json.dumps(
                                self._serialize_message(msg),
                                sort_keys=True,
                                ensure_ascii=False,
                            )
                            if seen_signatures.get(msg_id) == signature:
                                continue
                            seen_signatures[msg_id] = signature

                        if isinstance(msg, AIMessage):
                            ai_message_count += 1
                            usage = getattr(msg, "usage_metadata", None)
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
                                        "tool_calls": [{"name": tc["name"], "args": tc["args"], "id": tc.get("id")} for tc in msg.tool_calls],
                                    },
                                )

                            text = self._extract_text(msg.content)
                            if text:
                                if msg_id:
                                    cumulative_ai_content[msg_id] = text
                                event_data: dict[str, Any] = {"type": "ai", "content": text, "id": msg_id}
                                if usage:
                                    event_data["usage_metadata"] = {
                                        "input_tokens": usage.get("input_tokens", 0) or 0,
                                        "output_tokens": usage.get("output_tokens", 0) or 0,
                                        "total_tokens": usage.get("total_tokens", 0) or 0,
                                    }
                                yield StreamEvent(type="messages-tuple", data=event_data)

                        elif isinstance(msg, ToolMessage):
                            additional_kwargs = getattr(msg, "additional_kwargs", None) or {}
                            yield StreamEvent(
                                type="messages-tuple",
                                data={
                                    "type": "tool",
                                    "content": self._extract_text(msg.content),
                                    "name": getattr(msg, "name", None),
                                    "tool_call_id": getattr(msg, "tool_call_id", None),
                                    "id": msg_id,
                                    **({"additional_kwargs": additional_kwargs} if additional_kwargs else {}),
                                },
                            )
                            clarification = additional_kwargs.get("clarification")
                            if getattr(msg, "name", None) == "ask_clarification" and isinstance(clarification, dict):
                                dispatch_automation_event(
                                    "clarification.requested",
                                    {
                                        "thread_id": thread_id,
                                        "surface": configurable.get("surface"),
                                        "agent_name": self._agent_name or "lead_agent",
                                        **clarification,
                                    },
                                )
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
                                dispatch_automation_event(
                                    "permission.requested",
                                    {
                                        "thread_id": thread_id,
                                        "surface": configurable.get("surface"),
                                        "agent_name": self._agent_name or "lead_agent",
                                        **permission_request,
                                    },
                                )
                                yield StreamEvent(
                                    type="custom",
                                    data={
                                        "type": "permission_request",
                                        "id": msg_id,
                                        "tool_call_id": getattr(msg, "tool_call_id", None),
                                        **permission_request,
                                    },
                                )

                    yield StreamEvent(
                        type="values",
                        data={
                            "title": chunk.get("title"),
                            "messages": [self._serialize_message(m) for m in messages],
                            "artifacts": chunk.get("artifacts", []),
                        },
                    )

            _record_agent_event(
                event_type="agent_run_completed",
                thread_id=thread_id,
                message=f"Completed embedded agent run for thread '{thread_id}'",
                details={
                    "ai_message_count": ai_message_count,
                    "usage": cumulative_usage,
                    "surface": configurable.get("surface"),
                },
            )
            dispatch_automation_event(
                "agent.run.completed",
                {
                    "thread_id": thread_id,
                    "surface": configurable.get("surface"),
                    "agent_name": self._agent_name or "lead_agent",
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
                details={
                    "reason": str(exc),
                    "surface": configurable.get("surface"),
                },
            )
            dispatch_automation_event(
                "agent.run.failed",
                {
                    "thread_id": thread_id,
                    "surface": configurable.get("surface"),
                    "agent_name": self._agent_name or "lead_agent",
                    "reason": str(exc),
                },
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
                    "name": s.name,
                    "description": s.description,
                    "license": s.license,
                    "category": s.category,
                    "enabled": s.enabled,
                }
                for s in load_skills(enabled_only=enabled_only)
            ]
        }

    def get_memory(self) -> dict:
        """Get current memory data.

        Returns:
            Memory data dict (see src/agents/memory/updater.py for structure).
        """
        from nion.agents.memory.updater import get_memory_data

        return get_memory_data()

    def clear_memory(self) -> dict:
        """Clear all persisted memory data."""

        from nion.agents.memory.updater import clear_memory_data

        return clear_memory_data()

    def delete_memory_fact(self, fact_id: str) -> dict:
        """Delete a single fact from memory by fact id."""

        from nion.agents.memory.updater import delete_memory_fact

        return delete_memory_fact(fact_id)

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
        from nion.agents.memory.updater import reload_memory_data

        return reload_memory_data()

    def get_memory_config(self) -> dict:
        """Get memory system configuration.

        Returns:
            Memory config dict.
        """
        from nion.config.memory_config import get_memory_config

        config = get_memory_config()
        return {
            "enabled": config.enabled,
            "storage_path": config.storage_path,
            "debounce_seconds": config.debounce_seconds,
            "max_facts": config.max_facts,
            "fact_confidence_threshold": config.fact_confidence_threshold,
            "injection_enabled": config.injection_enabled,
            "max_injection_tokens": config.max_injection_tokens,
        }

    def get_memory_status(self) -> dict:
        """Get memory status: config + current data.

        Returns:
            Dict with "config" and "data" keys.
        """
        return {
            "config": self.get_memory_config(),
            "data": self.get_memory(),
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
