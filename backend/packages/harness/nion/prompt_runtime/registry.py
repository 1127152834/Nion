from __future__ import annotations

from dataclasses import dataclass, field, replace

from .models import AgentKind, PromptBuildContext, PromptSection
from .profiles import AgentPromptProfile
from .providers import PromptSectionProvider


@dataclass(slots=True, frozen=True)
class PromptSectionRegistration:
    provider_id: str
    provider: PromptSectionProvider
    agent_kinds: tuple[AgentKind, ...] = ()
    surfaces: tuple[str, ...] = ()
    enabled_by_default: bool = True
    order_hint: int = 0

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
        enabled_provider_ids = self._resolve_enabled_provider_ids(profile)
        resolved_sections: dict[str, tuple[int, int, str, PromptSection]] = {}

        for registration in self._ordered_registrations():
            if not registration.matches(context):
                continue
            if registration.provider_id not in enabled_provider_ids:
                continue

            built_sections = sorted(
                registration.provider.build(context),
                key=lambda section: section.order,
            )
            for section in built_sections:
                normalized_section = self._normalize_section(section, registration.provider_id)
                if not self._section_allowed_by_profile(normalized_section, profile):
                    continue
                current = resolved_sections.get(normalized_section.key)
                contender = (
                    normalized_section.priority,
                    registration.order_hint,
                    registration.provider_id,
                    normalized_section,
                )
                if current is None:
                    resolved_sections[normalized_section.key] = contender
                    continue
                winner = self._resolve_conflict(
                    key=normalized_section.key,
                    current=current,
                    contender=contender,
                )
                resolved_sections[normalized_section.key] = winner

        disabled_keys = profile.disabled_section_keys if profile is not None else frozenset()
        final_sections = [
            section
            for _, _, _, section in sorted(
                resolved_sections.values(),
                key=lambda item: (item[1], item[2], item[3].order, item[3].key),
            )
            if section.key not in disabled_keys
        ]
        return final_sections

    @staticmethod
    def _normalize_section(section: PromptSection, provider_id: str) -> PromptSection:
        if section.source == provider_id:
            return section
        return replace(section, source=provider_id)

    def _ordered_registrations(self) -> list[PromptSectionRegistration]:
        return sorted(
            self._registrations,
            key=lambda registration: (registration.order_hint, registration.provider_id),
        )

    def _resolve_enabled_provider_ids(
        self,
        profile: AgentPromptProfile | None,
    ) -> frozenset[str]:
        enabled = {
            registration.provider_id
            for registration in self._registrations
            if registration.enabled_by_default
        }
        if profile is None:
            return frozenset(enabled)

        enabled.update(profile.required_providers)
        enabled.update(profile.overlay_providers)
        return frozenset(enabled)

    @staticmethod
    def _section_allowed_by_profile(
        section: PromptSection,
        profile: AgentPromptProfile | None,
    ) -> bool:
        if profile is None or not profile.enabled_section_tags:
            return True
        return bool(profile.enabled_section_tags.intersection(section.tags))

    @staticmethod
    def _resolve_conflict(
        *,
        key: str,
        current: tuple[int, int, str, PromptSection],
        contender: tuple[int, int, str, PromptSection],
    ) -> tuple[int, int, str, PromptSection]:
        if contender[0] > current[0]:
            return contender
        if contender[0] < current[0]:
            return current
        if contender[1] > current[1]:
            return contender
        if contender[1] < current[1]:
            return current
        raise ValueError(
            f"Conflicting prompt section registrations for key '{key}' share the same priority and order_hint"
        )
