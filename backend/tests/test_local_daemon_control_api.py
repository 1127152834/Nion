from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_local_daemon_exposes_status_and_stop_routes() -> None:
    stopped = {"called": False}

    async def shutdown_callback() -> None:
        stopped["called"] = True

    with TestClient(create_app(shutdown_callback=shutdown_callback)) as client:
        status_response = client.get("/api/daemon/runtime-info")
        stop_response = client.post("/api/daemon/stop")

        assert status_response.status_code == 200
        assert stop_response.status_code == 202
        assert stopped["called"] is True
