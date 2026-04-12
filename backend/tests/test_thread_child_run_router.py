from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.orchestration.models import ChildRunRecord
from nion.orchestration.repository import ChildRunRepository


def test_threads_router_lists_child_runs(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = ChildRunRepository(base_dir=tmp_path)
    repo.save(
        ChildRunRecord(
            child_run_id="child-1",
            parent_thread_id="thread-1",
            agent_name="research-agent",
            title="Research Agent",
            status="running",
            description="Collect source material",
        )
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/threads/thread-1/child-runs")

    assert response.status_code == 200
    body = response.json()
    assert [item["child_run_id"] for item in body["items"]] == ["child-1"]


def test_threads_search_does_not_return_child_runs(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = ChildRunRepository(base_dir=tmp_path)
    repo.save(
        ChildRunRecord(
            child_run_id="child-1",
            parent_thread_id="thread-1",
            agent_name="research-agent",
            title="Research Agent",
            status="running",
            description="Collect source material",
        )
    )

    with TestClient(create_app()) as client:
        response = client.post("/api/threads/search", json={"scope": "all", "limit": 50})

    assert response.status_code == 200
    assert all("child_run_id" not in item for item in response.json())
