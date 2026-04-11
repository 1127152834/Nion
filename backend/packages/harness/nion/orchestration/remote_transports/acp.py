from __future__ import annotations

import os
import shutil
from typing import Any

from nion.config.acp_config import ACPAgentConfig
from nion.config.app_config import AppConfig
from nion.config.paths import get_paths


def _get_work_dir(thread_id: str | None) -> str:
    paths = get_paths()
    if thread_id:
        try:
            work_dir = paths.acp_workspace_dir(thread_id)
        except ValueError:
            work_dir = paths.base_dir / "acp-workspace"
    else:
        work_dir = paths.base_dir / "acp-workspace"
    work_dir.mkdir(parents=True, exist_ok=True)
    return str(work_dir)


def _resolve_agent_env(agent_config: ACPAgentConfig) -> dict[str, str]:
    resolved: dict[str, str] = {}
    for key, value in agent_config.env.items():
        resolved_value = AppConfig.resolve_env_variables(value, strict=False)
        if isinstance(resolved_value, str):
            resolved[key] = resolved_value
    return resolved


def _format_invocation_error(agent: str, cmd: str, exc: Exception) -> str:
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


def _build_permission_response(options: list[Any], *, auto_approve: bool) -> Any:
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


class ACPTransport:
    kind = "acp"

    def __init__(
        self,
        *,
        agent_name: str,
        agent_config: ACPAgentConfig,
    ) -> None:
        self.agent_name = agent_name
        self.agent_config = agent_config

    @classmethod
    def from_config(cls, *, agent_name: str, agent_config: ACPAgentConfig) -> "ACPTransport":
        return cls(agent_name=agent_name, agent_config=agent_config)

    async def run(self, prompt: str, *, thread_id: str | None = None) -> str:
        if not prompt.strip():
            return "ACP prompt cannot be empty."

        cmd = self.agent_config.command
        if shutil.which(cmd) is None:
            return (
                f"ACP adapter command '{cmd}' was not found for agent '{self.agent_name}'. "
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
                    auto_approve=self.agent_config.auto_approve_permissions,
                )

        client = _CollectingClient()
        process_env = os.environ.copy()
        process_env.update(_resolve_agent_env(self.agent_config))
        physical_cwd = _get_work_dir(thread_id)

        try:
            async with spawn_agent_process(
                client,
                cmd,
                *(self.agent_config.args or []),
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
                if self.agent_config.model:
                    session_kwargs["model"] = self.agent_config.model
                session = await conn.new_session(**session_kwargs)
                await conn.prompt(
                    session_id=session.session_id,
                    prompt=[text_block(prompt)],
                )
            return client.collected_text or "(no response)"
        except Exception as exc:
            return _format_invocation_error(self.agent_name, cmd, exc)
