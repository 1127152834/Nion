from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

PROMPT_DYNAMIC_BOUNDARY = "__PROMPT_DYNAMIC_BOUNDARY__"

PromptSectionScope = Literal["global_static", "session_dynamic", "turn_dynamic"]
PromptSectionLayer = Literal["core", "policy", "extension", "agent_overlay"]
AgentKind = Literal["lead", "custom", "builtin", "subagent", "bootstrap"]


@dataclass(slots=True)
class PromptSection:
    key: str
    title: str | None
    content: str
    scope: PromptSectionScope
    layer: PromptSectionLayer
    order: int
    enabled: bool = True
    tags: tuple[str, ...] = ()


@dataclass(slots=True)
class PromptBuildContext:
    agent_name: str | None
    agent_kind: AgentKind
    subagent_enabled: bool
    cli_tools_enabled: bool
    available_skills: set[str] | None
    max_concurrent_subagents: int
    surface: str
    model_name: str | None
    session_mode: str | None
    memory_enabled: bool
    extensions_enabled: bool


@dataclass(slots=True)
class PromptBuildArtifact:
    full_prompt: str
    static_prefix: str
    dynamic_suffix: str
    section_manifest: list[PromptSection] = field(default_factory=list)
