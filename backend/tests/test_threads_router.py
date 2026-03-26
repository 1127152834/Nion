import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import threads
from nion.threads.repository import ThreadRepository


def test_threads_search_route_exists() -> None:
    client = TestClient(create_app())
    response = client.post("/api/threads/search", json={"limit": 10})
    assert response.status_code == 200


def test_threads_stream_surfaces_runtime_errors_as_sse_events() -> None:
    app = create_app()

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
