from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.cli_tools.models import CliToolRuntimeInfo
from nion.cli_tools.repository import CliToolsRepository
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _configure_store(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    nion_home = tmp_path / "nion-home"
    nion_home.mkdir(parents=True, exist_ok=True)
    _write_extensions_config(extensions_path)
    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_HOME", str(nion_home))
    reset_app_config()
    reset_extensions_config()


def test_cli_catalog_reflects_runtime_projection_and_config_overrides(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)
    monkeypatch.setattr(
        "nion.cli_tools.service.detect_all_cli_tools",
        lambda: {
            "catalog": [
                CliToolRuntimeInfo(
                    id="ffmpeg",
                    status="installed",
                    version="7.1",
                    binPath="/opt/homebrew/bin/ffmpeg",
                )
            ],
            "extra": [
                CliToolRuntimeInfo(
                    id="ruff",
                    status="installed",
                    version="0.6.9",
                    binPath="/opt/bin/ruff",
                )
            ],
        },
    )

    try:
        with TestClient(create_app()) as client:
            update_response = client.put(
                "/api/cli/catalog/ffmpeg",
                json={"enabled": False, "description": "Video swiss army knife"},
            )
            assert update_response.status_code == 200
            assert update_response.json()["enabled"] is False
            assert update_response.json()["allowed"] is False
            assert update_response.json()["installed"] is True
            assert update_response.json()["description"] == "Video swiss army knife"
            assert update_response.json()["displayName"] == "FFmpeg"
            assert update_response.json()["version"] == "7.1"

            extra_response = client.put(
                "/api/cli/catalog/ruff",
                json={"enabled": True, "description": "Fast Python linter"},
            )
            assert extra_response.status_code == 200
            assert extra_response.json()["enabled"] is True
            assert extra_response.json()["installed"] is True
            assert extra_response.json()["configured"] is True
            assert extra_response.json()["version"] == "0.6.9"

            catalog_response = client.get("/api/cli/catalog")
            assert catalog_response.status_code == 200
            payload = catalog_response.json()["clis"]

            assert payload["ffmpeg"]["enabled"] is False
            assert payload["ffmpeg"]["allowed"] is False
            assert payload["ffmpeg"]["installed"] is True
            assert payload["ffmpeg"]["path"] == "/opt/homebrew/bin/ffmpeg"
            assert payload["ffmpeg"]["displayName"] == "FFmpeg"
            assert payload["ffmpeg"]["description"] == "Video swiss army knife"

            assert payload["ruff"]["enabled"] is True
            assert payload["ruff"]["allowed"] is True
            assert payload["ruff"]["installed"] is True
            assert payload["ruff"]["path"] == "/opt/bin/ruff"
            assert payload["ruff"]["displayName"] == "ruff"
            assert payload["ruff"]["description"] == "Fast Python linter"
    finally:
        reset_app_config()
        reset_extensions_config()


def test_cli_catalog_marks_missing_custom_override_as_disabled(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)
    monkeypatch.setattr(
        "nion.cli_tools.service.detect_all_cli_tools",
        lambda: {"catalog": [], "extra": []},
    )

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


def test_cli_tools_installed_filters_shadow_custom_tools(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)
    repo = CliToolsRepository()
    shadow_exec = tmp_path / "shadow-tool"
    shadow_exec.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    shadow_exec.chmod(0o755)
    visible_exec = tmp_path / "visible-tool"
    visible_exec.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    visible_exec.chmod(0o755)

    repo.upsert_custom_tool(
        name="FFmpeg",
        bin_path=str(shadow_exec),
        bin_name="ffmpeg",
        version="1.0.0",
        install_method="brew",
        install_package="ffmpeg",
    )
    visible = repo.upsert_custom_tool(
        name="Visible CLI",
        bin_path=str(visible_exec),
        bin_name="visible-tool",
        version="2.0.0",
        install_method="npm",
        install_package="@scope/visible-tool",
    )
    repo.upsert_description(
        tool_id=visible.id,
        zh="可见工具",
        en="Visible tool",
    )

    monkeypatch.setattr(
        "nion.cli_tools.service.detect_all_cli_tools",
        lambda: {
            "catalog": [
                CliToolRuntimeInfo(
                    id="ffmpeg",
                    status="installed",
                    version="7.1",
                    binPath=str(shadow_exec),
                )
            ],
            "extra": [],
        },
    )

    try:
        with TestClient(create_app()) as client:
            response = client.get("/api/cli-tools/installed")
            assert response.status_code == 200
            payload = response.json()
            assert payload["tools"][0]["id"] == "ffmpeg"
            assert payload["custom"] == [
                {
                    "id": "custom-visible-tool",
                    "name": "Visible CLI",
                    "binPath": str(visible_exec),
                    "binName": "visible-tool",
                    "version": "2.0.0",
                    "installMethod": "npm",
                    "installPackage": "@scope/visible-tool",
                    "enabled": True,
                    "createdAt": payload["custom"][0]["createdAt"],
                    "updatedAt": payload["custom"][0]["updatedAt"],
                }
            ]
            assert payload["descriptions"][visible.id]["en"] == "Visible tool"
    finally:
        reset_app_config()
        reset_extensions_config()
