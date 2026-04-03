from dataclasses import dataclass

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
) -> PromptSection:
    return PromptSection(
        key=key,
        title=key,
        content=content or key,
        scope="session_dynamic",
        layer="extension",
        order=order,
        priority=priority,
    )


def test_registry_collects_matching_sections_in_registration_then_order_sequence() -> None:
    registry = PromptSectionRegistry()
    first_provider = _StaticProvider(
        provider_id="provider.first",
        sections=[
            _make_section("first.z", order=30),
            _make_section("first.a", order=10),
        ],
    )
    second_provider = _StaticProvider(
        provider_id="provider.second",
        sections=[
            _make_section("second.b", order=20),
            _make_section("second.a", order=5),
        ],
    )
    registry.register(
        PromptSectionRegistration(
            provider=first_provider,
            agent_kinds=("lead",),
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider=second_provider,
            agent_kinds=("lead",),
        )
    )

    sections = registry.build_sections(_make_context(agent_kind="lead"))

    assert [section.key for section in sections] == [
        "first.a",
        "first.z",
        "second.a",
        "second.b",
    ]


def test_registry_filters_by_agent_kind_and_surface() -> None:
    registry = PromptSectionRegistry()
    registry.register(
        PromptSectionRegistration(
            provider=_StaticProvider(
                provider_id="provider.workspace",
                sections=[_make_section("workspace.only", order=10)],
            ),
            agent_kinds=("lead",),
            surfaces=("workspace",),
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider=_StaticProvider(
                provider_id="provider.chat",
                sections=[_make_section("chat.only", order=10)],
            ),
            agent_kinds=("builtin",),
            surfaces=("chat",),
        )
    )

    lead_workspace_sections = registry.build_sections(
        _make_context(agent_kind="lead", surface="workspace")
    )
    builtin_chat_sections = registry.build_sections(
        _make_context(agent_kind="builtin", surface="chat")
    )

    assert [section.key for section in lead_workspace_sections] == ["workspace.only"]
    assert [section.key for section in builtin_chat_sections] == ["chat.only"]


def test_registry_deduplicates_keys_by_highest_priority_then_latest_registration() -> None:
    registry = PromptSectionRegistry()
    registry.register(
        PromptSectionRegistration(
            provider=_StaticProvider(
                provider_id="provider.low",
                sections=[_make_section("shared.key", order=10, content="low", priority=10)],
            )
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider=_StaticProvider(
                provider_id="provider.high",
                sections=[_make_section("shared.key", order=1, content="high", priority=50)],
            )
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider=_StaticProvider(
                provider_id="provider.tie",
                sections=[_make_section("shared.key", order=99, content="tie", priority=50)],
            )
        )
    )

    sections = registry.build_sections(_make_context())

    assert len(sections) == 1
    assert sections[0].key == "shared.key"
    assert sections[0].content == "tie"
    assert sections[0].source == "provider.tie"


def test_registry_applies_profile_disabled_section_keys_after_resolution() -> None:
    registry = PromptSectionRegistry()
    registry.register(
        PromptSectionRegistration(
            provider=_StaticProvider(
                provider_id="provider.default",
                sections=[
                    _make_section("keep.me", order=10),
                    _make_section("disable.me", order=20),
                ],
            )
        )
    )
    profile = AgentPromptProfile(
        profile_id="lead.default",
        disabled_section_keys={"disable.me"},
    )

    sections = registry.build_sections(_make_context(), profile=profile)

    assert [section.key for section in sections] == ["keep.me"]


def test_registration_matches_without_explicit_filters() -> None:
    registration = PromptSectionRegistration(
        provider=_StaticProvider(
            provider_id="provider.default",
            sections=[_make_section("default.section", order=10)],
        )
    )

    assert registration.matches(_make_context(agent_kind="lead", surface="workspace")) is True
    assert registration.matches(_make_context(agent_kind="builtin", surface="chat")) is True
