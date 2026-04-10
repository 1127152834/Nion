from nion.agents.lead_agent.prompt import _build_subagent_section, apply_prompt_template
from nion.prompt_runtime.models import PromptBuildArtifact
from nion.prompt_sections import SYSTEM_PROMPT_TEMPLATE


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
    keys = [section.key for section in captured["sections"]]
    assert keys[0] == "core.role"
    assert "core.thinking_style" in keys
    assert "core.working_directory" in keys
    assert "dynamic.skills" in keys
    assert "dynamic.current_date" in keys
    sources = {section.source for section in captured["sections"]}
    assert "prompt.core" in sources
    assert "prompt.session" in sources
    assert "prompt.extensions" in sources


def test_apply_prompt_template_passes_available_skills_into_build_context(monkeypatch) -> None:
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

    apply_prompt_template(
        agent_name="bootstrap",
        available_skills={"bootstrap"},
    )

    assert captured["context"].available_skills == {"bootstrap"}
    assert captured["context"].agent_name == "bootstrap"
    assert any(section.key == "dynamic.skills" for section in captured["sections"])
    skills_section = next(
        section for section in captured["sections"] if section.key == "dynamic.skills"
    )
    assert skills_section.source == "prompt.extensions"


def test_subagent_prompt_runtime_context_marks_subagent_enabled(monkeypatch) -> None:
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

    apply_prompt_template(
        agent_name="subagent",
        subagent_enabled=True,
        max_concurrent_subagents=4,
    )

    assert captured["context"].subagent_enabled is True
    assert captured["context"].max_concurrent_subagents == 4
    assert any(section.key == "dynamic.subagent" for section in captured["sections"])
    subagent_section = next(
        section for section in captured["sections"] if section.key == "dynamic.subagent"
    )
    assert subagent_section.source == "prompt.overlays"


def test_apply_prompt_template_default_registry_builds_real_provider_sections(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def _fake_build_prompt_artifact(*, context, sections):
        captured["context"] = context
        captured["sections"] = sections
        return PromptBuildArtifact(
            full_prompt="STATIC\n\n__PROMPT_DYNAMIC_BOUNDARY__",
            static_prefix="STATIC",
            dynamic_suffix="",
            section_manifest=sections,
        )

    monkeypatch.setattr(
        "nion.agents.lead_agent.prompt.build_prompt_artifact",
        _fake_build_prompt_artifact,
    )

    apply_prompt_template(
        agent_name="notebook-chat",
        notebook_context={
            "note_id": "note_1",
            "note_title": "测试笔记",
            "note_relative_path": "Inbox/test.md",
            "note_body": "这是当前笔记正文",
            "selection_text": "",
        },
        cli_tools_enabled=True,
        selected_cli_tools=["docker"],
    )

    assert captured["context"].agent_name == "notebook-chat"
    keys = [section.key for section in captured["sections"]]
    assert keys[:3] == [
        "core.role",
        "core.thinking_style",
        "core.clarification_system",
    ]
    assert "core.soul" not in keys
    assert "dynamic.notebook_assistant" in keys
    assert "dynamic.current_notebook_note" in keys
    assert "dynamic.cli_tools" in keys
    assert "dynamic.user_selected_extensions" in keys
    notebook_overlay = next(
        section for section in captured["sections"] if section.key == "dynamic.notebook_assistant"
    )
    current_note = next(
        section for section in captured["sections"] if section.key == "dynamic.current_notebook_note"
    )
    assert notebook_overlay.source == "prompt.overlays"
    assert current_note.source == "prompt.overlays"
    assert "这是当前笔记正文" in current_note.content


def test_apply_prompt_template_default_registry_keeps_memory_only_in_session_dynamic(monkeypatch) -> None:
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
    monkeypatch.setattr(
        "nion.agents.lead_agent.prompt._get_memory_context",
        lambda *args, **kwargs: "<memory>remember me</memory>",
    )

    apply_prompt_template(agent_name="default")

    memory_sections = [
        section
        for section in captured["sections"]
        if "remember me" in section.content
    ]
    assert len(memory_sections) == 1
    assert memory_sections[0].key == "dynamic.memory"
    assert memory_sections[0].scope == "session_dynamic"
    assert memory_sections[0].source == "prompt.session"


def test_apply_prompt_template_does_not_consult_separate_soul_runtime(monkeypatch) -> None:
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
    monkeypatch.setattr(
        "nion.agents.lead_agent.prompt._get_memory_context",
        lambda *args, **kwargs: "<memory_os_context>\n## Core Identity\n稳定、克制、长期主义。\n</memory_os_context>",
    )

    apply_prompt_template(agent_name="default")

    keys = [section.key for section in captured["sections"]]
    assert "core.soul" not in keys
    memory_sections = [
        section
        for section in captured["sections"]
        if "Core Identity" in section.content
    ]
    assert len(memory_sections) == 1
    assert memory_sections[0].key == "dynamic.memory"


def test_apply_prompt_template_real_prompt_removes_legacy_extension_placeholders() -> None:
    prompt = apply_prompt_template(cli_tools_enabled=True, subagent_enabled=True)

    assert "{skills_section}" not in prompt
    assert "{deferred_tools_section}" not in prompt
    assert "{cli_tools_capability_section}" not in prompt
    assert "{subagent_section}" not in prompt
    assert "{acp_section}" not in prompt
    assert "{skills_section}" not in SYSTEM_PROMPT_TEMPLATE
    assert "{deferred_tools_section}" not in SYSTEM_PROMPT_TEMPLATE
    assert "{cli_tools_capability_section}" not in SYSTEM_PROMPT_TEMPLATE
    assert "{subagent_section}" not in SYSTEM_PROMPT_TEMPLATE
    assert "{acp_section}" not in SYSTEM_PROMPT_TEMPLATE


def test_build_subagent_section_hides_bash_when_host_bash_is_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(
        "nion.agents.lead_agent.prompt.get_available_subagent_names",
        lambda: ["general-purpose"],
    )

    section = _build_subagent_section(3)

    assert "Not available in the current sandbox configuration" in section
    assert 'read_file("/mnt/user-data/workspace/README.md")' in section


def test_apply_prompt_template_injects_user_selected_extensions_section(monkeypatch) -> None:
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

    apply_prompt_template(
        agent_name="default",
        cli_tools_enabled=True,
        selected_cli_tools=["docker"],
        selected_mcp_tools=["slack.search"],
        requested_skills=["claude-to-nion"],
    )

    keys = [section.key for section in captured["sections"]]
    assert "dynamic.user_selected_extensions" in keys
    selected_section = next(
        section for section in captured["sections"] if section.key == "dynamic.user_selected_extensions"
    )
    assert selected_section.source == "prompt.extensions"
    assert "claude-to-nion" in selected_section.content
    assert "slack.search" in selected_section.content
    assert "docker" in selected_section.content
