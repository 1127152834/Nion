from __future__ import annotations

from fastapi.testclient import TestClient

from app.daemon.app import create_app as create_daemon_app
from app.gateway.app import create_app as create_gateway_app
from nion.config.paths import reset_paths


def test_retrieval_models_router_exposes_status(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_gateway_app()) as client:
        response = client.get("/api/retrieval-models/status")

    assert response.status_code == 200
    assert response.json()["active_profile"]["embedding"]["mode"] == "remote_managed"


def test_retrieval_models_router_exposes_status_on_daemon_surface(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_daemon_app()) as client:
        response = client.get("/api/retrieval-models/status")

    assert response.status_code == 200
    assert response.json()["active_profile"]["embedding"]["mode"] == "remote_managed"
