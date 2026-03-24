from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_channels_status_returns_full_ops_contract_when_service_is_down():
    client = TestClient(create_app())

    response = client.get("/api/channels")

    assert response.status_code == 200
    assert response.json() == {
        "service_running": False,
        "pending_pair_requests": 0,
        "channels": {},
    }
