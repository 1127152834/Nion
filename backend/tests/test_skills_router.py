from collections.abc import Callable
from pathlib import Path
from typing import cast

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.skills.installer import SkillAlreadyExistsError
from nion.skills.validation import _validate_skill_frontmatter

VALIDATE_SKILL_FRONTMATTER = cast(
    Callable[[Path], tuple[bool, str, str | None]],
    _validate_skill_frontmatter,
)


def _write_skill(skill_dir: Path, frontmatter: str) -> None:
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(frontmatter, encoding="utf-8")


def test_validate_skill_frontmatter_allows_standard_optional_metadata(tmp_path: Path) -> None:
    skill_dir = tmp_path / "demo-skill"
    _write_skill(
        skill_dir,
        """---
name: demo-skill
description: Demo skill
version: 1.0.0
author: example.com/demo
compatibility: OpenClaw >= 1.0
license: MIT
---

# Demo Skill
""",
    )

    valid, message, skill_name = VALIDATE_SKILL_FRONTMATTER(skill_dir)

    assert valid is True
    assert message == "Skill is valid!"
    assert skill_name == "demo-skill"


def test_validate_skill_frontmatter_still_rejects_unknown_keys(tmp_path: Path) -> None:
    skill_dir = tmp_path / "demo-skill"
    _write_skill(
        skill_dir,
        """---
name: demo-skill
description: Demo skill
unsupported: true
---

# Demo Skill
""",
    )

    valid, message, skill_name = VALIDATE_SKILL_FRONTMATTER(skill_dir)

    assert valid is False
    assert "unsupported" in message
    assert skill_name is None


def test_validate_skill_frontmatter_reads_utf8_on_windows_locale(tmp_path, monkeypatch) -> None:
    skill_dir = tmp_path / "demo-skill"
    _write_skill(
        skill_dir,
        """---
name: demo-skill
description: "Curly quotes: \u201cutf8\u201d"
---

# Demo Skill
""",
    )

    original_read_text = Path.read_text

    def read_text_with_gbk_default(self, *args, **kwargs):
        kwargs.setdefault("encoding", "gbk")
        return original_read_text(self, *args, **kwargs)

    monkeypatch.setattr(Path, "read_text", read_text_with_gbk_default)

    valid, message, skill_name = VALIDATE_SKILL_FRONTMATTER(skill_dir)

    assert valid is True
    assert message == "Skill is valid!"
    assert skill_name == "demo-skill"


def test_install_skill_route_maps_file_not_found_to_404(monkeypatch, tmp_path: Path) -> None:
    archive_path = tmp_path / "missing.skill"

    monkeypatch.setattr(
        "app.gateway.routers.skills.resolve_thread_virtual_path",
        lambda thread_id, path: archive_path,
    )
    monkeypatch.setattr(
        "app.gateway.routers.skills.install_skill_from_archive",
        lambda path: (_ for _ in ()).throw(FileNotFoundError("Skill file not found: /mnt/user-data/outputs/missing.skill")),
    )

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/skills/install",
            json={"thread_id": "thread-1", "path": "/mnt/user-data/outputs/missing.skill"},
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Skill file not found: /mnt/user-data/outputs/missing.skill"


def test_install_skill_route_maps_duplicate_skill_to_409(monkeypatch, tmp_path: Path) -> None:
    archive_path = tmp_path / "demo.skill"

    monkeypatch.setattr(
        "app.gateway.routers.skills.resolve_thread_virtual_path",
        lambda thread_id, path: archive_path,
    )
    monkeypatch.setattr(
        "app.gateway.routers.skills.install_skill_from_archive",
        lambda path: (_ for _ in ()).throw(
            SkillAlreadyExistsError("Skill 'demo-skill' already exists. Please remove it first or use a different name.")
        ),
    )

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/skills/install",
            json={"thread_id": "thread-1", "path": "/mnt/user-data/outputs/demo.skill"},
        )

    assert response.status_code == 409
    assert response.json()["detail"] == "Skill 'demo-skill' already exists. Please remove it first or use a different name."


def test_install_skill_route_maps_value_error_to_400(monkeypatch, tmp_path: Path) -> None:
    archive_path = tmp_path / "bad.skill"

    monkeypatch.setattr(
        "app.gateway.routers.skills.resolve_thread_virtual_path",
        lambda thread_id, path: archive_path,
    )
    monkeypatch.setattr(
        "app.gateway.routers.skills.install_skill_from_archive",
        lambda path: (_ for _ in ()).throw(ValueError("Invalid skill: unsupported metadata")),
    )

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/skills/install",
            json={"thread_id": "thread-1", "path": "/mnt/user-data/outputs/bad.skill"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid skill: unsupported metadata"
