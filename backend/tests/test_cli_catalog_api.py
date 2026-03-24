from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import cli as cli_router
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _configure_store(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)
    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()


def test_cli_catalog_reflects_host_detection_and_config_overrides(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)
    monkeypatch.setattr(
        cli_router,
        "which",
        lambda name: {
            "python3": "/usr/bin/python3",
            "ruff": "/opt/bin/ruff",
        }.get(name),
    )

    try:
        with TestClient(create_app()) as client:
            update_response = client.put(
                "/api/cli/catalog/python3",
                json={"enabled": False, "description": "Python from override"},
            )
            assert update_response.status_code == 200
            assert update_response.json()["enabled"] is False
            assert update_response.json()["allowed"] is False
            assert update_response.json()["installed"] is True
            assert update_response.json()["description"] == "Python from override"

            custom_response = client.put(
                "/api/cli/catalog/ruff",
                json={"enabled": True, "description": "Ruff formatter"},
            )
            assert custom_response.status_code == 200
            assert custom_response.json()["enabled"] is True
            assert custom_response.json()["installed"] is True
            assert custom_response.json()["configured"] is True

            catalog_response = client.get("/api/cli/catalog")
            assert catalog_response.status_code == 200
            payload = catalog_response.json()["clis"]

            assert payload["python3"]["enabled"] is False
            assert payload["python3"]["allowed"] is False
            assert payload["python3"]["installed"] is True
            assert payload["python3"]["description"] == "Python from override"

            assert payload["ruff"]["enabled"] is True
            assert payload["ruff"]["allowed"] is True
            assert payload["ruff"]["installed"] is True
            assert payload["ruff"]["path"] == "/opt/bin/ruff"
            assert payload["ruff"]["description"] == "Ruff formatter"
    finally:
        reset_app_config()
        reset_extensions_config()


def test_cli_catalog_marks_missing_custom_cli_as_disabled(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)
    monkeypatch.setattr(cli_router, "which", lambda _name: None)

    try:
        with TestClient(create_app()) as client:
            update_response = client.put(
                "/api/cli/catalog/custom-cli",
                json={"enabled": True, "description": "Custom CLI"},
            )
            assert update_response.status_code == 200
            assert update_response.json()["enabled"] is False
            assert update_response.json()["allowed"] is True
            assert update_response.json()["installed"] is False

            catalog_response = client.get("/api/cli/catalog")
            assert catalog_response.status_code == 200
            payload = catalog_response.json()["clis"]["custom-cli"]
            assert payload["enabled"] is False
            assert payload["allowed"] is True
            assert payload["installed"] is False
            assert payload["configured"] is True
    finally:
        reset_app_config()
        reset_extensions_config()
