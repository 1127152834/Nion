from dataclasses import dataclass

import pytest

from nion.prompt_runtime.models import PromptBuildContext, PromptSection
from nion.prompt_runtime.profiles import AgentPromptProfile
from nion.prompt_runtime.registry import PromptSectionRegistration, PromptSectionRegistry


def _make_context(*, agent_kind: str = "lead", surface: str = "workspace") -> PromptBuildContext:
    return PromptBuildContext(
        agent_name="default",
        agent_kind=agent_kind,
        subagent_enabled=False,
        cli_tools_enabled=False,
        available_skills=None,
        max_concurrent_subagents=3,
        surface=surface,
        model_name="gpt-4.1",
        session_mode="thread",
        memory_enabled=True,
        extensions_enabled=True,
    )


@dataclass(slots=True)
class _StaticProvider:
    provider_id: str
    sections: list[PromptSection]

    def build(self, context: PromptBuildContext) -> list[PromptSection]:
        del context
        return list(self.sections)


def _make_section(
    key: str,
    *,
    order: int,
    content: str | None = None,
    priority: int = 0,
    tags: tuple[str, ...] = (),
    source: str | None = None,
) -> PromptSection:
    return PromptSection(
        key=key,
        title=key,
        content=content or key,
        scope="session_dynamic",
        layer="extension",
        order=order,
        priority=priority,
        tags=tags,
        source=source,
    )


def test_public_models_expose_stable_task3_facing_fields() -> None:
    registration = PromptSectionRegistration(
        provider_id="provider.default",
        provider=_StaticProvider(
            provider_id="provider.default",
            sections=[_make_section("default.section", order=10)],
        ),
        enabled_by_default=False,
        order_hint=25,
    )
    profile = AgentPromptProfile(
        profile_id="lead.default",
        kind="lead",
        enabled_section_tags={"stable"},
        required_providers={"provider.default"},
        overlay_providers=("provider.overlay",),
    )

    assert registration.provider_id == "provider.default"
    assert registration.enabled_by_default is False
    assert registration.order_hint == 25
    assert profile.kind == "lead"
    assert profile.enabled_section_tags == frozenset({"stable"})
    assert profile.required_providers == frozenset({"provider.default"})
    assert profile.overlay_providers == ("provider.overlay",)


def test_registry_selects_matching_provider_and_keeps_source_normalized_to_registration_id() -> None:
    registry = PromptSectionRegistry()
    registry.register(
        PromptSectionRegistration(
            provider_id="provider.workspace",
            provider=_StaticProvider(
                provider_id="provider.impl.workspace",
                sections=[_make_section("workspace.only", order=10, source="upstream-source")],
            ),
            agent_kinds=("lead",),
            surfaces=("workspace",),
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider_id="provider.chat",
            provider=_StaticProvider(
                provider_id="provider.chat",
                sections=[_make_section("chat.only", order=10)],
            ),
            agent_kinds=("builtin",),
            surfaces=("chat",),
        )
    )

    sections = registry.build_sections(_make_context(agent_kind="lead", surface="workspace"))

    assert [section.key for section in sections] == ["workspace.only"]
    assert sections[0].source == "provider.workspace"


def test_registry_profile_can_disable_provider_and_filter_section_tags() -> None:
    registry = PromptSectionRegistry()
    registry.register(
        PromptSectionRegistration(
            provider_id="provider.keep",
            provider=_StaticProvider(
                provider_id="provider.keep",
                sections=[
                    _make_section("keep.tagged", order=10, tags=("stable",)),
                    _make_section("drop.untagged", order=20),
                ],
            ),
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider_id="provider.overlay",
            provider=_StaticProvider(
                provider_id="provider.overlay",
                sections=[_make_section("drop.provider", order=5, tags=("stable",))],
            ),
            enabled_by_default=False,
        )
    )
    profile = AgentPromptProfile(
        profile_id="lead.default",
        kind="lead",
        enabled_section_tags={"stable"},
        overlay_providers=("provider.overlay",),
        disabled_section_keys={"drop.provider"},
    )

    sections = registry.build_sections(_make_context(), profile=profile)

    assert [section.key for section in sections] == ["keep.tagged"]


def test_registry_uses_priority_then_order_hint_then_provider_id_for_conflict_resolution() -> None:
    registry = PromptSectionRegistry()
    registry.register(
        PromptSectionRegistration(
            provider_id="provider.alpha",
            provider=_StaticProvider(
                provider_id="provider.alpha",
                sections=[_make_section("shared.key", order=20, content="alpha", priority=50)],
            ),
            order_hint=10,
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider_id="provider.beta",
            provider=_StaticProvider(
                provider_id="provider.beta",
                sections=[_make_section("shared.key", order=5, content="beta", priority=50)],
            ),
            order_hint=20,
        )
    )

    sections = registry.build_sections(_make_context())

    assert len(sections) == 1
    assert sections[0].content == "beta"
    assert sections[0].source == "provider.beta"


def test_registry_rejects_ambiguous_conflicts_when_priority_and_order_hint_are_identical() -> None:
    registry = PromptSectionRegistry()
    registry.register(
        PromptSectionRegistration(
            provider_id="provider.beta",
            provider=_StaticProvider(
                provider_id="provider.beta",
                sections=[_make_section("shared.key", order=10, content="beta", priority=50)],
            ),
            order_hint=20,
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider_id="provider.alpha",
            provider=_StaticProvider(
                provider_id="provider.alpha",
                sections=[_make_section("shared.key", order=10, content="alpha", priority=50)],
            ),
            order_hint=20,
        )
    )

    with pytest.raises(ValueError, match="shared.key"):
        registry.build_sections(_make_context())
