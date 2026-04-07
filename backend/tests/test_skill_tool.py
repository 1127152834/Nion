import json
from pathlib import Path

from langgraph.types import Command

from nion.skills.loader import load_skills
from nion.tools.builtins.skill_tool import use_skill_tool


def _write_skill(
    skill_dir: Path,
    *,
    name: str,
    description: str,
    allowed_tools: list[str] | None = None,
    model: str | None = None,
    effort: str | None = None,
    user_invocable: bool | None = None,
    hooks: list[str] | None = None,
    context_mode: str | None = None,
) -> None:
    skill_dir.mkdir(parents=True, exist_ok=True)
    frontmatter = [
        "---",
        f"name: {name}",
        f"description: {description}",
    ]
    if allowed_tools is not None:
        frontmatter.append("allowed-tools:")
        for item in allowed_tools:
            frontmatter.append(f"  - {item}")
    if model is not None:
        frontmatter.append(f"model: {model}")
    if effort is not None:
        frontmatter.append(f"effort: {effort}")
    if user_invocable is not None:
        frontmatter.append(f"user-invocable: {'true' if user_invocable else 'false'}")
    if hooks is not None:
        frontmatter.append("hooks:")
        for item in hooks:
            frontmatter.append(f"  - {item}")
    if context_mode is not None:
        frontmatter.append(f"context: {context_mode}")
    frontmatter.extend(["---", "", f"# {name}", "", "执行步骤说明"])
    (skill_dir / "SKILL.md").write_text("\n".join(frontmatter), encoding="utf-8")


def test_load_skills_parses_plugin_compatible_frontmatter_subset(tmp_path: Path) -> None:
    skills_root = tmp_path / "skills"
    _write_skill(
        skills_root / "public" / "planner",
        name="planner",
        description="Planning workflow",
        allowed_tools=["read_file", "bash"],
        model="gpt-5.2",
        effort="high",
        user_invocable=True,
        hooks=["pre_tool_use", "post_tool_use"],
        context_mode="fork",
    )

    skills = load_skills(skills_path=skills_root, use_config=False, enabled_only=False)
    skill = next(item for item in skills if item.name == "planner")

    assert skill.model == "gpt-5.2"
    assert skill.effort == "high"
    assert skill.user_invocable is True
    assert skill.hooks == ["pre_tool_use", "post_tool_use"]
    assert skill.context_mode == "fork"


def test_use_skill_tool_returns_plugin_compatible_runtime_fields(tmp_path: Path, monkeypatch) -> None:
    skills_root = tmp_path / "skills"
    _write_skill(
        skills_root / "public" / "planner",
        name="planner",
        description="Planning workflow",
        allowed_tools=["read_file", "bash"],
        model="gpt-5.2",
        effort="high",
        user_invocable=True,
        hooks=["pre_tool_use", "post_tool_use"],
        context_mode="fork",
    )

    monkeypatch.setattr(
        "nion.tools.builtins.skill_tool.load_skills",
        lambda enabled_only=False: load_skills(
            skills_path=skills_root,
            use_config=False,
            enabled_only=enabled_only,
        ),
    )

    command = use_skill_tool.func(skill_name="planner", tool_call_id="tc-1")
    assert isinstance(command, Command)
    payload = json.loads(command.update["messages"][0].content)

    assert payload["skill"]["model"] == "gpt-5.2"
    assert payload["skill"]["effort"] == "high"
    assert payload["skill"]["user_invocable"] is True
    assert payload["skill"]["hooks"] == ["pre_tool_use", "post_tool_use"]
    assert payload["skill"]["context"] == "fork"
