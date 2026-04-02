from fastapi.testclient import TestClient

from app.daemon.app import create_app as create_desktop_daemon_app
from app.runtime.app_factory import create_runtime_app


def test_web_mode_exposes_shared_routes_without_daemon_runtime() -> None:
    app = create_runtime_app(
        mode="web",
        title="Nion Runtime",
        description="runtime",
        version="0.1.0",
    )
    client = TestClient(app)

    assert client.get("/health").status_code == 200
    assert client.post("/api/threads/search", json={"limit": 1}).status_code == 200
    assert client.get("/api/projects").status_code == 404
    assert client.get("/api/desktop/runtime-info").status_code == 200
    assert client.get("/api/daemon/runtime-info").status_code == 404


def test_desktop_mode_exposes_shared_routes_and_daemon_runtime() -> None:
    app = create_runtime_app(
        mode="desktop",
        title="Nion Runtime",
        description="runtime",
        version="0.1.0",
    )
    app.state.daemon_service = type(
        "StubDaemonService",
        (),
        {
            "runtime_info": lambda self: {
                "mode": "local-daemon",
                "host": "127.0.0.1",
                "port": 43115,
                "base_url": "http://127.0.0.1:43115",
                "health_url": "http://127.0.0.1:43115/health",
                "working_directory": "/tmp",
                "allow_background_running": False,
                "shutdown_grace_period_seconds": 3,
                "clients": {
                    "total": 0,
                    "electron": 0,
                    "cli": 0,
                    "other": 0,
                },
            }
        },
    )()
    client = TestClient(app)

    assert client.get("/health").status_code == 200
    assert client.post("/api/threads/search", json={"limit": 1}).status_code == 200
    assert client.get("/api/projects").status_code == 404
    assert client.get("/api/daemon/runtime-info").status_code == 200


def test_desktop_wrapper_owns_daemon_service_lifecycle() -> None:
    with TestClient(create_desktop_daemon_app()) as client:
        assert hasattr(client.app.state, "daemon_service")
        assert client.get("/api/daemon/runtime-info").status_code == 200
