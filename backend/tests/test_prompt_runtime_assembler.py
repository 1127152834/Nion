from nion.prompt_runtime.assembler import build_prompt_artifact
from nion.prompt_runtime.models import (
    PROMPT_DYNAMIC_BOUNDARY,
    PromptBuildContext,
    PromptSection,
)


def _make_context() -> PromptBuildContext:
    return PromptBuildContext(
        agent_name="default",
        agent_kind="lead",
        subagent_enabled=False,
        cli_tools_enabled=False,
        available_skills=None,
        max_concurrent_subagents=3,
        surface="workspace",
        model_name="gpt-4.1",
        session_mode="thread",
        memory_enabled=True,
        extensions_enabled=True,
    )


def test_build_prompt_artifact_splits_static_and_dynamic_sections() -> None:
    sections = [
        PromptSection(
            key="core.role",
            title="Role",
            content="You are Nion.",
            scope="global_static",
            layer="core",
            order=10,
            source="prompt.core",
        ),
        PromptSection(
            key="dynamic.skills",
            title="Skills",
            content="Use skills.",
            scope="session_dynamic",
            layer="extension",
            order=20,
            source="prompt.extensions",
        ),
    ]

    artifact = build_prompt_artifact(_make_context(), sections)

    assert artifact.static_prefix == "You are Nion."
    assert artifact.dynamic_suffix == "Use skills."
    assert PROMPT_DYNAMIC_BOUNDARY in artifact.full_prompt
    assert artifact.provider_manifest == ["prompt.core", "prompt.extensions"]
    assert artifact.static_char_count == len("You are Nion.")
    assert artifact.dynamic_char_count == len("Use skills.")


def test_build_prompt_artifact_keeps_manifest_sorted_and_filters_disabled() -> None:
    sections = [
        PromptSection(
            key="dynamic.disabled",
            title="Disabled",
            content="disabled",
            scope="session_dynamic",
            layer="extension",
            order=30,
            enabled=False,
        ),
        PromptSection(
            key="core.a",
            title="A",
            content="A",
            scope="global_static",
            layer="core",
            order=20,
            source="prompt.core",
        ),
        PromptSection(
            key="core.b",
            title="B",
            content="B",
            scope="global_static",
            layer="core",
            order=10,
            source="prompt.core",
        ),
    ]

    artifact = build_prompt_artifact(_make_context(), sections)

    assert [section.key for section in artifact.section_manifest] == ["core.b", "core.a"]
    assert artifact.static_prefix == "B\n\nA"
    assert artifact.dynamic_suffix == ""
    assert artifact.provider_manifest == ["prompt.core"]
    assert artifact.static_char_count == len("B\n\nA")
    assert artifact.dynamic_char_count == 0


def test_build_prompt_artifact_is_stable_for_same_input() -> None:
    sections = [
        PromptSection(
            key="core.role",
            title="Role",
            content="You are Nion.",
            scope="global_static",
            layer="core",
            order=10,
            source="prompt.core",
        ),
        PromptSection(
            key="dynamic.memory",
            title="Memory",
            content="Memory context",
            scope="session_dynamic",
            layer="extension",
            order=20,
            source="prompt.session",
        ),
    ]

    artifact_a = build_prompt_artifact(_make_context(), sections)
    artifact_b = build_prompt_artifact(_make_context(), sections)

    assert artifact_a == artifact_b


def test_build_prompt_artifact_uses_section_sources_as_provider_manifest() -> None:
    sections = [
        PromptSection(
            key="core.role",
            title="Role",
            content="You are Nion.",
            scope="global_static",
            layer="core",
            order=10,
            source="prompt.core",
        ),
        PromptSection(
            key="dynamic.skills",
            title="Skills",
            content="Use skills.",
            scope="session_dynamic",
            layer="extension",
            order=20,
            source="prompt.extensions",
        ),
        PromptSection(
            key="dynamic.overlay",
            title="Overlay",
            content="Extra guidance.",
            scope="turn_dynamic",
            layer="agent_overlay",
            order=30,
            source="prompt.extensions",
        ),
    ]

    artifact = build_prompt_artifact(_make_context(), sections)

    assert artifact.provider_manifest == ["prompt.core", "prompt.extensions"]
