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
    monkeypatch.setattr(
        "app.gateway.routers.skills.install_skill_from_archive",
        lambda path: __import__("nion.skills.installer", fromlist=["install_skill_from_archive"]).install_skill_from_archive(
            path,
            skills_root=skills_root,
        ),
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


def test_skills_update_initializes_config_with_shared_resolver(monkeypatch, tmp_path: Path):
    extensions_path = tmp_path / "extensions_config.json"
    skills_root = tmp_path / "skills"
    custom_dir = skills_root / "custom" / "custom-skill"
    _write_skill(custom_dir, "custom-skill", "Custom skill")

    monkeypatch.delenv("NION_EXTENSIONS_CONFIG_PATH", raising=False)
    monkeypatch.setattr(
        "app.gateway.routers.skills.load_skills",
        lambda enabled_only=False: load_skills(
            skills_path=skills_root,
            use_config=False,
            enabled_only=enabled_only,
        ),
    )
    monkeypatch.setattr(
        "app.gateway.routers.skills._resolve_or_initialize_extensions_config_path",
        lambda: extensions_path,
    )
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            response = client.put(
                "/api/skills/custom-skill",
                json={"enabled": False},
            )

        assert response.status_code == 200
        assert extensions_path.exists()
        payload = json.loads(extensions_path.read_text(encoding="utf-8"))
        assert payload["skills"]["custom:custom-skill"]["enabled"] is False
    finally:
        reset_extensions_config()


def test_initialize_extensions_config_path_creates_missing_explicit_target(
    monkeypatch,
    tmp_path: Path,
) -> None:
    explicit_path = tmp_path / "nested" / "extensions_config.json"

    monkeypatch.delenv("NION_EXTENSIONS_CONFIG_PATH", raising=False)

    from nion.config.extensions_config import ExtensionsConfig

    resolved = ExtensionsConfig.initialize_config_path(str(explicit_path))

    assert resolved == explicit_path
    assert explicit_path.exists()
    payload = json.loads(explicit_path.read_text(encoding="utf-8"))
    assert payload == {"mcpServers": {}, "skills": {}}


def test_initialize_extensions_config_path_defaults_to_project_root_parent(
    monkeypatch,
    tmp_path: Path,
) -> None:
    backend_dir = tmp_path / "backend"
    backend_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.chdir(backend_dir)
    monkeypatch.delenv("NION_EXTENSIONS_CONFIG_PATH", raising=False)

    from nion.config.extensions_config import ExtensionsConfig

    resolved = ExtensionsConfig.initialize_config_path()

    assert resolved == tmp_path / "extensions_config.json"
    assert resolved.exists()


def test_skills_update_supports_skill_id_path_and_persists_id_key(
    monkeypatch,
    tmp_path: Path,
):
    extensions_path = tmp_path / "extensions_config.json"
    skills_root = tmp_path / "skills"
    custom_dir = skills_root / "custom" / "team" / "custom-skill"
    _write_skill(custom_dir, "custom-skill", "Custom skill")
    _write_extensions_config(extensions_path)

    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setattr(
        "app.gateway.routers.skills.load_skills",
        lambda enabled_only=False: load_skills(
            skills_path=skills_root,
            use_config=False,
            enabled_only=enabled_only,
        ),
    )
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            response = client.put(
                "/api/skills/custom%3Ateam%3A%3Acustom-skill",
                json={"enabled": False},
            )

        assert response.status_code == 200
        payload = json.loads(extensions_path.read_text(encoding="utf-8"))
        assert payload["skills"]["custom:team::custom-skill"]["enabled"] is False
    finally:
        reset_extensions_config()
