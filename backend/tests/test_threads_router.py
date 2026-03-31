import json

from fastapi.testclient import TestClient

from app.daemon.app import create_app as create_daemon_app
from app.gateway.app import create_app
from app.gateway.routers import threads
from nion.threads.repository import ThreadRepository


def test_threads_search_route_exists() -> None:
    client = TestClient(create_app())
    response = client.post("/api/threads/search", json={"limit": 10})
    assert response.status_code == 200


def test_threads_search_route_supports_thread_id_filter(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    from nion.config import paths as paths_module

    paths_module._paths = None

    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread("thread-1", title="One", values={"messages": [], "artifacts": []})
    repository.upsert_thread("thread-2", title="Two", values={"messages": [], "artifacts": []})

    client = TestClient(create_app())
    response = client.post("/api/threads/search", json={"thread_id": "thread-2", "limit": 10})

    assert response.status_code == 200
    assert [item["thread_id"] for item in response.json()] == ["thread-2"]


def test_threads_stream_surfaces_runtime_errors_as_sse_events() -> None:
    app = create_daemon_app()

    class FailingThreadService:
        def stream(self, thread_id: str, payload):
            raise RuntimeError("upstream unavailable")

    app.dependency_overrides[threads.get_thread_service] = lambda: FailingThreadService()
    with TestClient(app) as client:
        response = client.post(
            "/api/threads/new/stream",
            json={
                "messages": [{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
                "context": {},
                "config": {},
            },
        )

        assert response.status_code == 200
        assert 'event: created' in response.text
        assert 'event: error' in response.text
        assert json.dumps({"message": "upstream unavailable"}) in response.text


def test_delete_thread_route_removes_thread_directory(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    from nion.config import paths as paths_module

    paths_module._paths = None

    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread("thread-1", title="T", values={"messages": [], "artifacts": []})

    thread_dir = tmp_path / "threads" / "thread-1" / "user-data" / "outputs"
    thread_dir.mkdir(parents=True)

    client = TestClient(create_app())
    response = client.delete("/api/threads/thread-1")

    assert response.status_code == 204
    assert not (tmp_path / "threads" / "thread-1").exists()


def test_threads_stream_finished_increments_autodream_session_counter(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    from nion.config import paths as paths_module

    paths_module._paths = None

    class SuccessfulThreadService:
        def stream(self, thread_id: str, payload):
            yield type("Event", (), {"type": "message", "data": {"ok": True}})()

    app = create_daemon_app()
    app.dependency_overrides[threads.get_thread_service] = lambda: SuccessfulThreadService()

    with TestClient(app) as client:
        before = client.get("/api/autodream/status")
        assert before.status_code == 200
        assert before.json()["session_count_since_last_run"] == 0

        response = client.post(
            "/api/threads/new/stream",
            json={
                "messages": [{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
                "context": {},
                "config": {},
            },
        )

        assert response.status_code == 200
        assert "event: message" in response.text

        after = client.get("/api/autodream/status")
        assert after.status_code == 200
        assert after.json()["session_count_since_last_run"] == 1
        maintenance = client.get("/api/self-maintenance/status")
        assert maintenance.status_code == 200
        assert maintenance.json()["session_count_since_last_run"] == 1


def test_threads_stream_failed_does_not_increment_autodream_session_counter(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    from nion.config import paths as paths_module

    paths_module._paths = None

    class FailingThreadService:
        def stream(self, thread_id: str, payload):
            raise RuntimeError("upstream unavailable")

    app = create_daemon_app()
    app.dependency_overrides[threads.get_thread_service] = lambda: FailingThreadService()

    with TestClient(app) as client:
        before = client.get("/api/autodream/status")
        assert before.status_code == 200
        assert before.json()["session_count_since_last_run"] == 0

        response = client.post(
            "/api/threads/new/stream",
            json={
                "messages": [{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
                "context": {},
                "config": {},
            },
        )

        assert response.status_code == 200
        assert "event: error" in response.text

        after = client.get("/api/autodream/status")
        assert after.status_code == 200
        assert after.json()["session_count_since_last_run"] == 0
        maintenance = client.get("/api/self-maintenance/status")
        assert maintenance.status_code == 200
        assert maintenance.json()["session_count_since_last_run"] == 0
