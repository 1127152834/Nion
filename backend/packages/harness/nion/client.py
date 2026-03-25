"""NionClient — Embedded Python client for Nion agent system."""

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
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.runnables import RunnableConfig

from nion.agents.lead_agent.agent import _build_middlewares
from nion.agents.lead_agent.prompt import apply_prompt_template
from nion.agents.thread_state import ThreadState
from nion.automation.event_dispatch import dispatch_automation_event
from nion.config.agents_config import AGENT_NAME_PATTERN
from nion.config.app_config import get_app_config
from nion.config.extensions_config import (
    ExtensionsConfig,
    SkillStateConfig,
    get_extensions_config,
    reload_extensions_config,
)
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
    type: str
    data: dict[str, Any] = field(default_factory=dict)


class NionClient:
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
        self._app_config = get_app_config()

        if agent_name is not None and not AGENT_NAME_PATTERN.match(agent_name):
            raise ValueError(
                f"Invalid agent name '{agent_name}'. Must match pattern: {AGENT_NAME_PATTERN.pattern}"
            )

        self._checkpointer = checkpointer
        self._model_name = model_name
        self._thinking_enabled = thinking_enabled
        self._subagent_enabled = subagent_enabled
        self._plan_mode = plan_mode
        self._agent_name = agent_name
        self._agent = None
        self._agent_config_key: tuple | None = None

    def reset_agent(self) -> None:
        self._agent = None
        self._agent_config_key = None

    @staticmethod
    def _atomic_write_json(path: Path, data: dict) -> None:
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
            "middleware": _build_middlewares(
                config,
                model_name=model_name,
                agent_name=self._agent_name,
            ),
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

    @staticmethod
    def _get_tools(
        *,
        model_name: str | None,
        subagent_enabled: bool,
        cli_tools_enabled: bool = False,
        surface: str = "workspace",
    ):
        from nion.tools import get_available_tools

        return get_available_tools(
            model_name=model_name,
            subagent_enabled=subagent_enabled,
            cli_tools_enabled=cli_tools_enabled,
            surface=surface,
        )
