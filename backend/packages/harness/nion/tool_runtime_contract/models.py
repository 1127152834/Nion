from __future__ import annotations

from dataclasses import dataclass, field

from nion.tools.runtime_models import ToolExecutionStage, ToolRuntimeResult


@dataclass(slots=True)
class ToolExecutionContext:
    thread_id: str | None
    surface: str
    agent_name: str | None
    execution_mode: str | None
    selected_extensions: dict[str, list[str]] = field(default_factory=dict)
    session_guidance: dict[str, object] = field(default_factory=dict)
