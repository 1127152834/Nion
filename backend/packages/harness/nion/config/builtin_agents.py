"""Built-in agent catalog definitions."""

from __future__ import annotations

from pydantic import BaseModel


class BuiltinAgentConfig(BaseModel):
    """Configuration for a built-in agent exposed in the catalog."""

    id: str
    name: str
    description: str = ""
    model: str | None = None
    tool_groups: list[str] | None = None
    entrypoint: str
    tool_policy: str
    kind: str = "builtin"
    visibility: str = "public"
    can_delete: bool = False
    can_edit: bool = False
    soul: str = ""


NOTEBOOK_ASSISTANT = BuiltinAgentConfig(
    id="builtin:notebook-assistant",
    name="笔记助手",
    description="内置的笔记工作流助手，作为公开 catalog agent 出现在 Agent 页面。",
    entrypoint="notebook-chat",
    tool_policy="notebook-basic",
)


BUILTIN_AGENTS: tuple[BuiltinAgentConfig, ...] = (NOTEBOOK_ASSISTANT,)
