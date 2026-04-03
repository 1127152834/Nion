from __future__ import annotations

from dataclasses import dataclass, field, replace

from .models import AgentKind, PromptBuildContext, PromptSection
from .profiles import AgentPromptProfile
from .providers import PromptSectionProvider


@dataclass(slots=True, frozen=True)
class PromptSectionRegistration:
    provider: PromptSectionProvider
    agent_kinds: tuple[AgentKind, ...] = ()
    surfaces: tuple[str, ...] = ()

    def matches(self, context: PromptBuildContext) -> bool:
        if self.agent_kinds and context.agent_kind not in self.agent_kinds:
            return False
        if self.surfaces and context.surface not in self.surfaces:
            return False
        return True


@dataclass(slots=True)
class PromptSectionRegistry:
    _registrations: list[PromptSectionRegistration] = field(default_factory=list)

    def register(self, registration: PromptSectionRegistration) -> None:
        self._registrations.append(registration)

    def build_sections(
        self,
        context: PromptBuildContext,
        *,
        profile: AgentPromptProfile | None = None,
    ) -> list[PromptSection]:
        resolved_sections: dict[str, tuple[int, int, int, str, PromptSection]] = {}

        for registration_index, registration in enumerate(self._registrations):
            if not registration.matches(context):
                continue

            built_sections = sorted(
                registration.provider.build(context),
                key=lambda section: section.order,
            )
            for section in built_sections:
                normalized_section = self._normalize_section(section, registration.provider.provider_id)
                current = resolved_sections.get(normalized_section.key)
                contender = (
                    normalized_section.priority,
                    registration_index,
                    normalized_section.order,
                    normalized_section.key,
                    normalized_section,
                )
                if current is None or contender[:2] >= current[:2]:
                    resolved_sections[normalized_section.key] = contender

        disabled_keys = profile.disabled_section_keys if profile is not None else frozenset()
        final_sections = [
            section
            for _, _, _, _, section in sorted(
                resolved_sections.values(),
                key=lambda item: (item[1], item[2], item[3]),
            )
            if section.key not in disabled_keys
        ]
        return final_sections

    @staticmethod
    def _normalize_section(section: PromptSection, provider_id: str) -> PromptSection:
        if section.source == provider_id:
            return section
        return replace(section, source=provider_id)
