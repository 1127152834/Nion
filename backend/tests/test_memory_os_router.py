from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths


def test_memory_os_router_lists_provider_families(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/memory-os/providers/families")

    assert response.status_code == 200
    payload = response.json()
    assert [item["family"] for item in payload["families"]] == [
        "builtin",
        "mem0",
        "openviking",
    ]
    assert payload["families"][1]["supported_modes"] == ["managed"]


def test_memory_os_router_returns_active_binding_state(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/memory-os/providers/state")

    assert response.status_code == 200
    assert response.json()["active_provider_family"] == "builtin"


def test_memory_os_router_updates_active_binding_state(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.put(
            "/api/memory-os/providers/state",
            json={
                "active_provider_family": "openviking",
                "active_provider_id": "provider-1",
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["active_provider_family"] == "openviking"
        assert payload["active_provider_id"] == "provider-1"


def test_memory_os_router_exposes_provider_status_and_capabilities(
    monkeypatch, tmp_path
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        client.put(
            "/api/memory-os/providers/state",
            json={
                "active_provider_family": "openviking",
                "active_provider_id": "ov-embedded",
                "providers": [
                    {
                        "id": "ov-embedded",
                        "family": "openviking",
                        "name": "Embedded OpenViking",
                        "config": {"mode": "embedded"},
                    }
                ],
            },
        )
        families = client.get("/api/memory-os/providers/families")
        state = client.get("/api/memory-os/providers/state")

    assert families.status_code == 200
    assert state.status_code == 200
    assert families.json()["families"][2]["capabilities"]["runtime_status"] == "supported"
    provider = state.json()["providers"][0]
    assert provider["config"]["mode"] == "embedded"
    assert provider["status"]["health"] == "healthy"
    assert provider["capabilities"]["memory_crud"] == "supported"
