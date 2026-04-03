from __future__ import annotations

from dataclasses import dataclass

from .models import AgentKind


@dataclass(slots=True, frozen=True)
class AgentPromptProfile:
    profile_id: str
    kind: AgentKind | None = None
    disabled_section_keys: frozenset[str] = frozenset()
    enabled_section_tags: frozenset[str] = frozenset()
    required_providers: frozenset[str] = frozenset()
    overlay_providers: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "disabled_section_keys",
            frozenset(self.disabled_section_keys),
        )
        object.__setattr__(
            self,
            "enabled_section_tags",
            frozenset(self.enabled_section_tags),
        )
        object.__setattr__(
            self,
            "required_providers",
            frozenset(self.required_providers),
        )
        object.__setattr__(
            self,
            "overlay_providers",
            tuple(self.overlay_providers),
        )
