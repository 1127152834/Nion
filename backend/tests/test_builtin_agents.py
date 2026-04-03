"""Tests for built-in agent catalog support."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _make_paths(base_dir: Path):
    from nion.config.paths import Paths

    return Paths(base_dir=base_dir)


def _make_test_app():
    from app.gateway.routers.agents import router

    app = FastAPI()
    app.include_router(router)
    return app


def test_get_builtin_agent_returns_404_for_notebook_module_assistant(tmp_path):
    paths_instance = _make_paths(tmp_path)

    with patch("nion.config.agents_config.get_paths", return_value=paths_instance), patch(
        "app.gateway.routers.agents.get_paths",
        return_value=paths_instance,
    ):
        with TestClient(_make_test_app()) as client:
            response = client.get("/api/agents/notebook-chat")

    assert response.status_code == 404


def test_get_builtin_agent_by_legacy_identifier_returns_404(tmp_path):
    paths_instance = _make_paths(tmp_path)

    with patch("nion.config.agents_config.get_paths", return_value=paths_instance), patch(
        "app.gateway.routers.agents.get_paths",
        return_value=paths_instance,
    ):
        with TestClient(_make_test_app()) as client:
            response = client.get("/api/agents/notebook-assistant")

    assert response.status_code == 404


def test_delete_builtin_agent_reports_not_found_for_notebook_module_assistant(tmp_path):
    paths_instance = _make_paths(tmp_path)

    with patch("nion.config.agents_config.get_paths", return_value=paths_instance), patch(
        "app.gateway.routers.agents.get_paths",
        return_value=paths_instance,
    ):
        with TestClient(_make_test_app()) as client:
            response = client.delete("/api/agents/notebook-chat")

    assert response.status_code == 404


def test_list_builtin_agents_excludes_notebook_module_assistant(tmp_path):
    paths_instance = _make_paths(tmp_path)

    with patch("nion.config.agents_config.get_paths", return_value=paths_instance), patch(
        "app.gateway.routers.agents.get_paths",
        return_value=paths_instance,
    ):
        with TestClient(_make_test_app()) as client:
            response = client.get("/api/agents")

    assert response.status_code == 200
    agents = response.json()["agents"]
    assert all(agent["slug"] != "notebook-chat" for agent in agents)
