from pathlib import Path

from nion.skills.validation import (
    ALLOWED_FRONTMATTER_PROPERTIES,
    _validate_skill_frontmatter,
)


def _write_skill(tmp_path: Path, content: str) -> Path:
    skill_file = tmp_path / "SKILL.md"
    skill_file.write_text(content, encoding="utf-8")
    return tmp_path


def test_validate_skill_frontmatter_rejects_missing_skill_md(tmp_path: Path):
    valid, msg, name = _validate_skill_frontmatter(tmp_path)
    assert valid is False
    assert "not found" in msg
    assert name is None


def test_validate_skill_frontmatter_rejects_missing_name(tmp_path: Path):
    skill_dir = _write_skill(
        tmp_path,
        "---\ndescription: skill without name\n---\n",
    )
    valid, msg, name = _validate_skill_frontmatter(skill_dir)
    assert valid is False
    assert "name" in msg.lower()
    assert name is None


def test_validate_skill_frontmatter_rejects_missing_description(tmp_path: Path):
    skill_dir = _write_skill(
        tmp_path,
        "---\nname: demo-skill\n---\n",
    )
    valid, msg, name = _validate_skill_frontmatter(skill_dir)
    assert valid is False
    assert "description" in msg.lower()
    assert name is None


def test_validate_skill_frontmatter_rejects_invalid_yaml(tmp_path: Path):
    skill_dir = _write_skill(tmp_path, "---\n[invalid yaml: {{\n---\n")
    valid, msg, name = _validate_skill_frontmatter(skill_dir)
    assert valid is False
    assert "yaml" in msg.lower()
    assert name is None


def test_validate_skill_frontmatter_rejects_description_with_angle_brackets(tmp_path: Path):
    skill_dir = _write_skill(
        tmp_path,
        "---\nname: demo-skill\ndescription: Has <html> tags\n---\n",
    )
    valid, msg, name = _validate_skill_frontmatter(skill_dir)
    assert valid is False
    assert "angle brackets" in msg.lower()
    assert name is None


def test_validate_skill_frontmatter_rejects_invalid_hyphen_name(tmp_path: Path):
    skill_dir = _write_skill(
        tmp_path,
        "---\nname: DemoSkill\ndescription: demo\n---\n",
    )
    valid, msg, name = _validate_skill_frontmatter(skill_dir)
    assert valid is False
    assert "hyphen-case" in msg
    assert name is None


def test_validate_skill_frontmatter_allowed_properties_constant():
    assert "name" in ALLOWED_FRONTMATTER_PROPERTIES
    assert "description" in ALLOWED_FRONTMATTER_PROPERTIES
    assert "license" in ALLOWED_FRONTMATTER_PROPERTIES
