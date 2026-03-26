import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.extensions_config import reset_extensions_config
from nion.config.paths import get_paths
from nion.skills.loader import load_skills
from nion.telemetry.store import TelemetryStore


def _write_extensions_config(path: Path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _write_skill(skill_dir: Path, name: str, description: str) -> None:
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: {description}\n---\n\n# {name}\n",
        encoding="utf-8",
    )


def test_skill_update_records_human_readable_event(monkeypatch, tmp_path: Path) -> None:
    extensions_path = tmp_path / "extensions_config.json"
    skills_root = tmp_path / "skills"
    custom_dir = skills_root / "custom" / "custom-skill"
    _write_extensions_config(extensions_path)
    _write_skill(custom_dir, "custom-skill", "Custom skill")

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
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
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            update_response = client.put(
                "/api/skills/custom-skill",
                json={"enabled": False},
            )
            assert update_response.status_code == 200

        store = TelemetryStore(get_paths().telemetry_db_file)
        events = store.list_events(limit=10, category="skill")
        applied_event = next(event for event in events if event.event_type == "skill_update_applied")
        assert applied_event.message == "Updated skill 'custom-skill'"
        assert applied_event.skill_name == "custom-skill"
        assert applied_event.details["enabled"] is False
    finally:
        reset_extensions_config()


def test_skill_read_records_event(monkeypatch, tmp_path: Path) -> None:
    extensions_path = tmp_path / "extensions_config.json"
    skills_root = tmp_path / "skills"
    custom_dir = skills_root / "custom" / "custom-skill"
    _write_extensions_config(extensions_path)
    _write_skill(custom_dir, "custom-skill", "Custom skill")

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
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
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            response = client.get("/api/skills/custom-skill")
            assert response.status_code == 200

        store = TelemetryStore(get_paths().telemetry_db_file)
        events = store.list_events(limit=10, category="skill", skill_name="custom-skill")
        read_event = next(event for event in events if event.event_type == "skill_read")
        assert read_event.message == "Read skill 'custom-skill'"
        assert read_event.details["category"] == "custom"
    finally:
        reset_extensions_config()
