from __future__ import annotations

import json
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.extensions_config import reset_extensions_config
from nion.skills.loader import load_skills


def _write_extensions_config(path: Path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _write_skill(skill_dir: Path, name: str, description: str) -> None:
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: {description}\n---\n\n# {name}\n",
        encoding="utf-8",
    )


def test_skills_api_list_update_install_delete(monkeypatch, tmp_path: Path):
    extensions_path = tmp_path / "extensions_config.json"
    skills_root = tmp_path / "skills"
    public_dir = skills_root / "public" / "public-skill"
    custom_dir = skills_root / "custom" / "custom-skill"
    _write_extensions_config(extensions_path)
    _write_skill(public_dir, "public-skill", "Public skill")
    _write_skill(custom_dir, "custom-skill", "Custom skill")

    install_src = tmp_path / "archive-src" / "new-skill"
    _write_skill(install_src, "new-skill", "Installed skill")
    archive_path = tmp_path / "new-skill.skill"
    with zipfile.ZipFile(archive_path, "w") as zf:
        zf.write(install_src / "SKILL.md", "new-skill/SKILL.md")

    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setattr(
        "app.gateway.routers.skills.get_skills_root_path",
        lambda: skills_root,
    )
    monkeypatch.setattr(
        "app.gateway.routers.skills.load_skills",
        lambda enabled_only=False: load_skills(
            skills_path=skills_root,
            use_config=False,
            enabled_only=enabled_only,
        ),
    )
    monkeypatch.setattr(
        "app.gateway.routers.skills.resolve_thread_virtual_path",
        lambda thread_id, path: archive_path,
    )
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            list_response = client.get("/api/skills")
            assert list_response.status_code == 200
            skill_names = [item["name"] for item in list_response.json()["skills"]]
            assert "public-skill" in skill_names
            assert "custom-skill" in skill_names

            update_response = client.put(
                "/api/skills/custom-skill",
                json={"enabled": False},
            )
            assert update_response.status_code == 200
            assert update_response.json()["enabled"] is False

            install_response = client.post(
                "/api/skills/install",
                json={"thread_id": "thread-1", "path": "/mnt/user-data/outputs/new-skill.skill"},
            )
            assert install_response.status_code == 200
            assert install_response.json()["skill_name"] == "new-skill"
            assert (skills_root / "custom" / "new-skill").exists()

            delete_response = client.delete("/api/skills/custom-skill")
            assert delete_response.status_code == 200
            assert delete_response.json()["success"] is True
            assert not (skills_root / "custom" / "custom-skill").exists()

            reject_public = client.delete("/api/skills/public-skill")
            assert reject_public.status_code == 400
    finally:
        reset_extensions_config()
