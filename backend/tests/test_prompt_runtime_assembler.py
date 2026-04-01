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
        ),
        PromptSection(
            key="dynamic.skills",
            title="Skills",
            content="Use skills.",
            scope="session_dynamic",
            layer="extension",
            order=20,
        ),
    ]

    artifact = build_prompt_artifact(_make_context(), sections)

    assert artifact.static_prefix == "You are Nion."
    assert artifact.dynamic_suffix == "Use skills."
    assert PROMPT_DYNAMIC_BOUNDARY in artifact.full_prompt


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
        ),
        PromptSection(
            key="core.b",
            title="B",
            content="B",
            scope="global_static",
            layer="core",
            order=10,
        ),
    ]

    artifact = build_prompt_artifact(_make_context(), sections)

    assert [section.key for section in artifact.section_manifest] == ["core.b", "core.a"]
    assert artifact.static_prefix == "B\n\nA"
    assert artifact.dynamic_suffix == ""


def test_build_prompt_artifact_is_stable_for_same_input() -> None:
    sections = [
        PromptSection(
            key="core.role",
            title="Role",
            content="You are Nion.",
            scope="global_static",
            layer="core",
            order=10,
        ),
        PromptSection(
            key="dynamic.memory",
            title="Memory",
            content="Memory context",
            scope="session_dynamic",
            layer="extension",
            order=20,
        ),
    ]

    artifact_a = build_prompt_artifact(_make_context(), sections)
    artifact_b = build_prompt_artifact(_make_context(), sections)

    assert artifact_a == artifact_b
