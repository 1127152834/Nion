from nion.prompt_runtime.models import (
    PROMPT_DYNAMIC_BOUNDARY,
    PromptBuildArtifact,
    PromptBuildContext,
    PromptSection,
)


def test_prompt_section_preserves_scope_and_layer() -> None:
    section = PromptSection(
        key="core.role",
        title="Role",
        content="You are Nion.",
        scope="global_static",
        layer="core",
        order=10,
    )

    assert section.key == "core.role"
    assert section.scope == "global_static"
    assert section.layer == "core"
    assert section.enabled is True


def test_prompt_build_context_captures_agent_runtime_inputs() -> None:
    context = PromptBuildContext(
        agent_name="notebook-chat",
        agent_kind="builtin",
        subagent_enabled=False,
        cli_tools_enabled=False,
        available_skills={"notebook"},
        max_concurrent_subagents=3,
        surface="workspace",
        model_name="gpt-4.1",
        session_mode="temporary_chat",
        memory_enabled=True,
        extensions_enabled=True,
    )

    assert context.agent_name == "notebook-chat"
    assert context.agent_kind == "builtin"
    assert context.available_skills == {"notebook"}
    assert context.memory_enabled is True


def test_prompt_build_artifact_exposes_all_layers() -> None:
    section = PromptSection(
        key="dynamic.skills",
        title="Skills",
        content="Use skills.",
        scope="session_dynamic",
        layer="extension",
        order=20,
    )
    artifact = PromptBuildArtifact(
        full_prompt=f"static\n{PROMPT_DYNAMIC_BOUNDARY}\ndynamic",
        static_prefix="static",
        dynamic_suffix="dynamic",
        section_manifest=[section],
    )

    assert artifact.full_prompt.startswith("static")
    assert artifact.static_prefix == "static"
    assert artifact.dynamic_suffix == "dynamic"
    assert artifact.section_manifest == [section]


def test_prompt_dynamic_boundary_is_stable_marker() -> None:
    assert PROMPT_DYNAMIC_BOUNDARY == "__PROMPT_DYNAMIC_BOUNDARY__"
