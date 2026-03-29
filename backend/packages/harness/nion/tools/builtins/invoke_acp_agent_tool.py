"""ACP-compatible external agent invocation tool."""

from __future__ import annotations

import logging
import os
import shutil
from typing import Annotated, Any

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, InjectedToolArg, StructuredTool
from pydantic import BaseModel, Field

from nion.config.acp_config import ACPAgentConfig
from nion.config.app_config import AppConfig
from nion.config.paths import get_paths

logger = logging.getLogger(__name__)


class _InvokeACPAgentInput(BaseModel):
    agent: str = Field(description="Name of the ACP agent to invoke")
    prompt: str = Field(description="The concise task prompt to send to the agent")


def _get_work_dir(thread_id: str | None) -> str:
    """Return the ACP workspace, preferring a thread-scoped directory."""
    paths = get_paths()
    if thread_id:
        try:
            work_dir = paths.acp_workspace_dir(thread_id)
        except ValueError:
            logger.warning("Invalid thread_id %r for ACP workspace, falling back to global", thread_id)
            work_dir = paths.base_dir / "acp-workspace"
    else:
        work_dir = paths.base_dir / "acp-workspace"
    work_dir.mkdir(parents=True, exist_ok=True)
    return str(work_dir)


def _build_permission_response(options: list[Any], *, auto_approve: bool) -> Any:
    """Build an ACP permission response with deny-by-default semantics."""
    from acp import RequestPermissionResponse
    from acp.schema import AllowedOutcome, DeniedOutcome

    if auto_approve:
        for preferred_kind in ("allow_once", "allow_always"):
            for option in options:
                if getattr(option, "kind", None) != preferred_kind:
                    continue

                option_id = getattr(option, "option_id", None)
                if option_id is None:
                    option_id = getattr(option, "optionId", None)
                if option_id is None:
                    continue

                return RequestPermissionResponse(
                    outcome=AllowedOutcome(outcome="selected", optionId=option_id),
                )

    return RequestPermissionResponse(outcome=DeniedOutcome(outcome="cancelled"))


def _format_invocation_error(agent: str, cmd: str, exc: Exception) -> str:
    """Return a user-facing ACP invocation error with actionable remediation."""
    if not isinstance(exc, FileNotFoundError):
        return f"Error invoking ACP agent '{agent}': {exc}"

    message = f"Error invoking ACP agent '{agent}': Command '{cmd}' was not found on PATH."
    if cmd == "codex-acp" and shutil.which("codex"):
        return (
            f"{message} The installed `codex` CLI does not speak ACP directly. "
            "Install a Codex ACP adapter or update Agent Integrations settings."
        )

    return (
        f"{message} Install the agent binary or update "
        f"`acp_agents.{agent}.command` in Config Center."
    )


def _resolve_agent_env(agent_config: ACPAgentConfig) -> dict[str, str]:
    resolved: dict[str, str] = {}
    for key, value in agent_config.env.items():
        resolved_value = AppConfig.resolve_env_variables(value, strict=False)
        if isinstance(resolved_value, str):
            resolved[key] = resolved_value
    return resolved


def build_invoke_acp_agent_tool(
    acp_agents: dict[str, ACPAgentConfig],
) -> BaseTool:
    """Create the ``invoke_acp_agent`` tool from configured ACP agents."""
    agent_lines = "\n".join(f"- {name}: {cfg.description}" for name, cfg in acp_agents.items())
    description = (
        "Invoke an external ACP-compatible agent and return its final response.\n\n"
        "Available agents:\n"
        f"{agent_lines}\n\n"
        "IMPORTANT: ACP agents operate in their own independent workspace. "
        "Do NOT include /mnt/user-data paths in the prompt. "
        "Give the agent a self-contained task description."
    )

    agents = dict(acp_agents)

    async def _invoke(
        agent: str,
        prompt: str,
        config: Annotated[RunnableConfig | None, InjectedToolArg] = None,
    ) -> str:
        if not prompt.strip():
            return "ACP prompt cannot be empty."

        agent_config = agents.get(agent)
        if agent_config is None:
            available = ", ".join(sorted(agents))
            return f"Unknown ACP agent '{agent}'. Configured agents: {available or '(none)'}"

        thread_id: str | None = ((config or {}).get("configurable") or {}).get("thread_id")
        cmd = agent_config.command
        if shutil.which(cmd) is None:
            return (
                f"ACP adapter command '{cmd}' was not found for agent '{agent}'. "
                "Install the adapter or update Agent Integrations settings."
            )

        try:
            from acp import PROTOCOL_VERSION, Client, spawn_agent_process, text_block
            from acp.schema import ClientCapabilities, Implementation, TextContentBlock
        except ImportError:
            return (
                "Error: agent-client-protocol package is not installed. "
                "Run `uv sync` to install project dependencies."
            )

        class _CollectingClient(Client):
            def __init__(self) -> None:
                self._chunks: list[str] = []

            @property
            def collected_text(self) -> str:
                return "".join(self._chunks)

            async def session_update(self, session_id: str, update, **kwargs) -> None:  # type: ignore[override]
                content = getattr(update, "content", None)
                if isinstance(content, TextContentBlock):
                    self._chunks.append(content.text)

            async def request_permission(self, options, session_id: str, tool_call, **kwargs):  # type: ignore[override]
                return _build_permission_response(
                    options,
                    auto_approve=agent_config.auto_approve_permissions,
                )

        client = _CollectingClient()
        process_env = os.environ.copy()
        process_env.update(_resolve_agent_env(agent_config))
        physical_cwd = _get_work_dir(thread_id)

        try:
            async with spawn_agent_process(
                client,
                cmd,
                *(agent_config.args or []),
                cwd=physical_cwd,
                env=process_env,
            ) as (conn, proc):
                del proc
                await conn.initialize(
                    protocol_version=PROTOCOL_VERSION,
                    client_capabilities=ClientCapabilities(),
                    client_info=Implementation(name="nion", title="Nion", version="0.1.0"),
                )
                session_kwargs: dict[str, Any] = {"cwd": physical_cwd}
                if agent_config.model:
                    session_kwargs["model"] = agent_config.model
                session = await conn.new_session(**session_kwargs)
                await conn.prompt(
                    session_id=session.session_id,
                    prompt=[text_block(prompt)],
                )
            return client.collected_text or "(no response)"
        except Exception as exc:
            logger.error("ACP agent '%s' invocation failed: %s", agent, exc)
            return _format_invocation_error(agent, cmd, exc)

    return StructuredTool.from_function(
        name="invoke_acp_agent",
        description=description,
        coroutine=_invoke,
        args_schema=_InvokeACPAgentInput,
    )
