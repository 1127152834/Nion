import zipfile
from pathlib import Path

import pytest

from nion.skills.installer import SkillAlreadyExistsError, install_skill_from_archive


def _write_skill(skill_dir: Path, *, name: str = "demo-skill") -> None:
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(
        f"""---
name: {name}
description: Demo skill
---

# Demo Skill
""",
        encoding="utf-8",
    )


def test_install_skill_from_archive_rejects_unsafe_member(tmp_path: Path):
    archive = tmp_path / "bad.skill"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("../evil.txt", "x")

    with pytest.raises(ValueError, match="unsafe member path"):
        install_skill_from_archive(archive, skills_root=tmp_path / "skills")


def test_install_skill_from_archive_rejects_duplicate_name(tmp_path: Path):
    source_dir = tmp_path / "demo-skill"
    _write_skill(source_dir)

    archive = tmp_path / "demo-skill.skill"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.write(source_dir / "SKILL.md", "demo-skill/SKILL.md")

    skills_root = tmp_path / "skills"
    custom_dir = skills_root / "custom" / "demo-skill"
    _write_skill(custom_dir)

    with pytest.raises(SkillAlreadyExistsError):
        install_skill_from_archive(archive, skills_root=skills_root)
