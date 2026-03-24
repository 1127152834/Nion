from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallTurn


def test_recall_search_returns_global_results(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    archive.append_turns(
        thread_id="thread-1",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="We fixed staging by rotating the token.",
                source_message_id="ai-1",
            )
        ],
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/recall/search", params={"q": "rotating token", "limit": 5})

    assert response.status_code == 200
    payload = response.json()
    assert payload["scope"] == "global"
    assert payload["results"][0]["thread_id"] == "thread-1"


def test_recall_search_honors_thread_scope(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    archive.append_turns(
        thread_id="thread-1",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="We rotated the staging token.",
                source_message_id="ai-1",
            )
        ],
    )
    archive.append_turns(
        thread_id="thread-2",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="We rotated the production token.",
                source_message_id="ai-2",
            )
        ],
    )

    with TestClient(create_app()) as client:
        response = client.get(
            "/api/recall/search",
            params={"q": "rotated token", "limit": 5, "thread_id": "thread-1"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["scope"] == "thread"
    assert len(payload["results"]) == 1
    assert payload["results"][0]["thread_id"] == "thread-1"
