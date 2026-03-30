from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_memory_os_router_returns_openviking_mode_details(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

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

        response = client.get("/api/memory-os/providers/state")

    assert response.status_code == 200
    payload = response.json()
    assert payload["active_provider_family"] == "openviking"
    assert payload["providers"][0]["config"]["mode"] == "embedded"
