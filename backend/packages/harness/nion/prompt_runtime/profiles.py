from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True, frozen=True)
class AgentPromptProfile:
    profile_id: str
    disabled_section_keys: frozenset[str] = frozenset()

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "disabled_section_keys",
            frozenset(self.disabled_section_keys),
        )
