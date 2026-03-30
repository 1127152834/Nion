from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.paths import reset_paths
from nion.threads.repository import ThreadRepository


def test_notebook_assistant_threads_are_excluded_from_general_search(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread(
        "workspace-thread",
        title="Workspace Chat",
        values={
            "messages": [],
            "artifacts": [],
        },
    )
    repository.upsert_thread(
        "notebook-thread",
        title="Notebook Assistant",
        values={
            "messages": [],
            "artifacts": [],
            "scope": "notebook_assistant",
            "note_id": "note-1",
            "notebook_session_id": "session-1",
        },
    )

    with TestClient(create_app()) as client:
        response = client.post("/api/threads/search", json={"limit": 10})

    assert response.status_code == 200
    assert [item["thread_id"] for item in response.json()] == ["workspace-thread"]


def test_notebook_assistant_thread_id_filter_respects_scope(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread(
        "notebook-thread",
        title="Notebook Assistant",
        values={
            "messages": [],
            "artifacts": [],
            "scope": "notebook_assistant",
            "note_id": "note-1",
            "notebook_session_id": "session-1",
        },
    )

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/threads/search",
            json={"thread_id": "notebook-thread", "scope": "general", "limit": 10},
        )

    assert response.status_code == 200
    assert response.json() == []


def test_notebook_assistant_session_bootstrap_reuses_existing_thread(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/threads/notebook-assistant/session",
            json={"note_id": "note-1", "session_id": "session-1"},
        )
        assert created.status_code == 200
        created_payload = created.json()

        restored = client.post(
            "/api/threads/notebook-assistant/session",
            json={"note_id": "note-1", "session_id": "session-1"},
        )

    assert restored.status_code == 200
    restored_payload = restored.json()
    assert restored_payload["thread_id"] == created_payload["thread_id"]
    assert restored_payload["created"] is False
    assert restored_payload["values"]["scope"] == "notebook_assistant"
    assert restored_payload["values"]["note_id"] == "note-1"
    assert restored_payload["values"]["notebook_session_id"] == "session-1"


def test_notebook_assistant_session_bootstrap_creates_distinct_threads_per_session(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        first = client.post(
            "/api/threads/notebook-assistant/session",
            json={"note_id": "note-1", "session_id": "session-1"},
        )
        second = client.post(
            "/api/threads/notebook-assistant/session",
            json={"note_id": "note-1", "session_id": "session-2"},
        )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["thread_id"] != second.json()["thread_id"]
    assert first.json()["created"] is True
    assert second.json()["created"] is True
