from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_local_daemon_exposes_runtime_and_threads_routes() -> None:
    with TestClient(create_app()) as client:
        health = client.get("/health")
        runtime = client.get("/api/daemon/runtime-info")
        threads = client.post("/api/threads/search", json={"limit": 1})

        assert health.status_code == 200
        assert runtime.status_code == 200
        assert runtime.json()["host"] == "127.0.0.1"
        assert runtime.json()["mode"] == "local-daemon"
        assert threads.status_code == 200
