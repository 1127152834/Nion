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


def test_notebook_assistant_rewrite_api_round_trip(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Assistant Rewrite", "body": "draft body"},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        applied = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/apply",
            json={
                "content": "clean body",
                "expected_content_hash": note["content_hash"],
            },
        )
        assert applied.status_code == 200
        assert applied.json()["note"]["body"] == "clean body"
        assert applied.json()["pending_rewrite"]["original_content"] == "draft body"
        assert applied.json()["pending_rewrite"]["applied_content"] == "clean body"

        confirmed = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/confirm",
            json={},
        )
        assert confirmed.status_code == 200
        assert confirmed.json()["pending_rewrite"] is None
        assert confirmed.json()["note"]["body"] == "clean body"


def test_notebook_assistant_rewrite_cancel_keeps_note_body(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Assistant Rewrite Cancel", "body": "draft body"},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        applied = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/apply",
            json={
                "content": "clean body",
                "expected_content_hash": note["content_hash"],
            },
        )
        assert applied.status_code == 200
        assert applied.json()["note"]["body"] == "clean body"

        cancelled = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/cancel",
            json={},
        )
        assert cancelled.status_code == 200
        assert cancelled.json()["pending_rewrite"] is None
        assert cancelled.json()["note"]["body"] == "draft body"


def test_notebook_assistant_rewrite_sessions_share_note_scoped_pending_state(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Scoped Rewrite", "body": "draft body"},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        session_a = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/apply",
            json={
                "content": "rewrite from a",
                "expected_content_hash": note["content_hash"],
            },
        )
        assert session_a.status_code == 200
        assert session_a.json()["note"]["body"] == "rewrite from a"

        session_b = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/apply",
            json={
                "content": "rewrite from b",
                "expected_content_hash": session_a.json()["note"]["content_hash"],
            },
        )
        assert session_b.status_code == 200
        assert session_b.json()["note"]["body"] == "rewrite from b"

        confirmed_a = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/confirm",
            json={},
        )
        assert confirmed_a.status_code == 200
        assert confirmed_a.json()["note"]["body"] == "rewrite from b"
        assert confirmed_a.json()["pending_rewrite"] is None

        cancelled_b = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/cancel",
            json={},
        )
        assert cancelled_b.status_code == 404
