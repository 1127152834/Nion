from nion.prompt_runtime.diagnostics import project_prompt_diagnostics
from nion.prompt_runtime.models import PROMPT_DYNAMIC_BOUNDARY, PromptBuildArtifact, PromptSection


def test_prompt_diagnostics_projection_exposes_scope_layer_and_source() -> None:
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
    artifact = PromptBuildArtifact(
        full_prompt=f"You are Nion.\n\n{PROMPT_DYNAMIC_BOUNDARY}\n\nUse skills.",
        static_prefix="You are Nion.",
        dynamic_suffix="Use skills.",
        section_manifest=sections,
        provider_manifest=["prompt.core", "prompt.extensions"],
    )

    diagnostics = project_prompt_diagnostics(artifact)

    assert diagnostics["provider_manifest"] == ["prompt.core", "prompt.extensions"]
    assert diagnostics["static_char_count"] == len("You are Nion.")
    assert diagnostics["dynamic_char_count"] == len("Use skills.")
    assert diagnostics["sections"][0]["scope"] == "global_static"
    assert diagnostics["sections"][0]["layer"] == "core"
    assert diagnostics["sections"][0]["source"] == "prompt.core"
    assert diagnostics["sections"][1]["scope"] == "session_dynamic"
    assert diagnostics["sections"][1]["layer"] == "extension"
    assert diagnostics["sections"][1]["source"] == "prompt.extensions"


def test_prompt_diagnostics_projection_groups_sections_by_scope_layer_and_source() -> None:
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
            content="Remember this.",
            scope="session_dynamic",
            layer="extension",
            order=20,
            source="prompt.session",
        ),
        PromptSection(
            key="dynamic.skills",
            title="Skills",
            content="Use skills.",
            scope="session_dynamic",
            layer="extension",
            order=30,
            source="prompt.extensions",
        ),
    ]
    artifact = PromptBuildArtifact(
        full_prompt=f"You are Nion.\n\n{PROMPT_DYNAMIC_BOUNDARY}\n\nRemember this.\n\nUse skills.",
        static_prefix="You are Nion.",
        dynamic_suffix="Remember this.\n\nUse skills.",
        section_manifest=sections,
        provider_manifest=["prompt.core", "prompt.session", "prompt.extensions"],
    )

    diagnostics = project_prompt_diagnostics(artifact)

    assert diagnostics["section_counts_by_scope"] == {
        "global_static": 1,
        "session_dynamic": 2,
    }
    assert diagnostics["section_counts_by_layer"] == {
        "core": 1,
        "extension": 2,
    }
    assert diagnostics["section_counts_by_source"] == {
        "prompt.core": 1,
        "prompt.session": 1,
        "prompt.extensions": 1,
    }
