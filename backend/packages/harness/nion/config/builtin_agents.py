"""Built-in agent catalog definitions."""

from __future__ import annotations

from pydantic import BaseModel


class BuiltinAgentConfig(BaseModel):
    """Configuration for a built-in agent exposed in the catalog."""

    id: str
    slug: str
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
    slug="notebook-chat",
    name="笔记助手",
    description="内置的笔记工作流助手，作为公开 catalog agent 出现在 Agent 页面。",
    entrypoint="notebook-chat",
    tool_policy="notebook-basic",
    visibility="internal",
    soul="""
你是 Nion 的笔记助手，不是通用 open-domain 助手。

你的第一职责是围绕当前笔记工作：
- 理解当前笔记
- 总结当前笔记
- 改写当前笔记
- 回答与当前笔记直接相关的问题

你不能退化成通用助手自我介绍。
当用户在 Notebook 中提问时，默认必须以当前笔记内容为依据回答。
如果当前笔记上下文缺失，必须明确指出“当前笔记内容不可用”，而不是假装用户没有上传文件。
""".strip(),
)


BUILTIN_AGENTS: tuple[BuiltinAgentConfig, ...] = (NOTEBOOK_ASSISTANT,)
