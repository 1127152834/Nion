from nion.prompt_runtime.models import PromptBuildArtifact
from nion.agents.lead_agent.prompt import apply_prompt_template


def test_apply_prompt_template_uses_prompt_runtime_artifact(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def _fake_build_prompt_artifact(*, context, sections):
        captured["context"] = context
        captured["sections"] = sections
        return PromptBuildArtifact(
            full_prompt="STATIC\n\n__PROMPT_DYNAMIC_BOUNDARY__\n\nDYNAMIC",
            static_prefix="STATIC",
            dynamic_suffix="DYNAMIC",
            section_manifest=sections,
        )

    monkeypatch.setattr(
        "nion.agents.lead_agent.prompt.build_prompt_artifact",
        _fake_build_prompt_artifact,
    )

    prompt = apply_prompt_template(
        agent_name="default",
        subagent_enabled=False,
        cli_tools_enabled=False,
    )

    assert prompt.startswith("STATIC")
    assert "__PROMPT_DYNAMIC_BOUNDARY__" in prompt
    assert captured["context"].agent_name == "default"
    assert isinstance(captured["sections"], list)


def test_apply_prompt_template_passes_available_skills_into_build_context(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def _fake_build_prompt_artifact(*, context, sections):
        captured["context"] = context
        return PromptBuildArtifact(
            full_prompt="STATIC\n\n__PROMPT_DYNAMIC_BOUNDARY__\n\nDYNAMIC",
            static_prefix="STATIC",
            dynamic_suffix="DYNAMIC",
            section_manifest=sections,
        )

    monkeypatch.setattr(
        "nion.agents.lead_agent.prompt.build_prompt_artifact",
        _fake_build_prompt_artifact,
    )

    apply_prompt_template(
        agent_name="bootstrap",
        available_skills={"bootstrap"},
    )

    assert captured["context"].available_skills == {"bootstrap"}
    assert captured["context"].agent_name == "bootstrap"


def test_subagent_prompt_runtime_context_marks_subagent_enabled(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def _fake_build_prompt_artifact(*, context, sections):
        captured["context"] = context
        return PromptBuildArtifact(
            full_prompt="STATIC\n\n__PROMPT_DYNAMIC_BOUNDARY__\n\nDYNAMIC",
            static_prefix="STATIC",
            dynamic_suffix="DYNAMIC",
            section_manifest=sections,
        )

    monkeypatch.setattr(
        "nion.agents.lead_agent.prompt.build_prompt_artifact",
        _fake_build_prompt_artifact,
    )

    apply_prompt_template(
        agent_name="subagent",
        subagent_enabled=True,
        max_concurrent_subagents=4,
    )

    assert captured["context"].subagent_enabled is True
    assert captured["context"].max_concurrent_subagents == 4
