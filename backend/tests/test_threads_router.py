import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import threads


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
    client = TestClient(app)

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
