from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths


def test_compaction_router_exposes_compact_logs_status_and_usage(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        compact_response = client.post("/api/memory/compact", json={"ratio": 0.8})
        logs_response = client.get("/api/memory/compact/logs")
        status_response = client.get("/api/memory/status")
        usage_response = client.get("/api/memory/usage")

    assert compact_response.status_code == 200
    assert logs_response.status_code == 200
    assert status_response.status_code == 200
    assert usage_response.status_code == 200
