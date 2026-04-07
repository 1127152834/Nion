from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.paths import reset_paths
from nion.notebook.service import NotebookService
from nion.threads.repository import ThreadRepository
from nion.threads.service import ThreadService


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
    assert "project_id" not in restored_payload["values"]
    assert "memory" not in restored_payload["values"]


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


def test_notebook_assistant_runtime_reads_note_body_without_persisting_it(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    service = NotebookService(base_dir=tmp_path)
    note = service.create_note(directory="", title="搜索阿斯顿", body="我叫张天成，哈哈哈你是谁啊阿斯顿")

    captured: dict[str, object] = {}

    def fake_stream(
        self,
        message,
        *,
        thread_id=None,
        human_message_payload=None,
        **kwargs,
    ):
        del self, message, thread_id, human_message_payload
        captured["kwargs"] = kwargs
        yield from ()

    monkeypatch.setattr("nion.client.NionClient.stream", fake_stream)

    thread_service = ThreadService()
    list(
        thread_service.stream(
            "thread-1",
            type("Req", (), {
                "messages": [{"type": "human", "content": "这篇笔记说了什么"}],
                "context": {
                    "agent_name": "notebook-chat",
                    "notebook_note_id": note.note_id,
                    "notebook_note_title": note.title,
                    "notebook_session_id": "session-1",
                },
                "config": {},
                "assistant_id": None,
            })(),
        )
    )

    notebook_context = captured["kwargs"]["notebook_context"]
    assert notebook_context["note_id"] == note.note_id
    assert notebook_context["note_title"] == note.title
    assert notebook_context["note_body"] == note.body

    stored = thread_service.get_or_create_notebook_assistant_session(
        note_id=note.note_id,
        session_id="session-1",
    )[0]
    assert "note_body" not in stored.values.model_dump()


def test_notebook_assistant_runtime_passes_notebook_chat_agent_name(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    service = NotebookService(base_dir=tmp_path)
    note = service.create_note(directory="", title="搜索阿斯顿", body="我叫张天成，哈哈哈你是谁啊阿斯顿")

    captured: dict[str, object] = {}

    def fake_stream(
        self,
        message,
        *,
        thread_id=None,
        human_message_payload=None,
        **kwargs,
    ):
        del self, message, thread_id, human_message_payload
        captured["kwargs"] = kwargs
        yield from ()

    monkeypatch.setattr("nion.client.NionClient.stream", fake_stream)

    thread_service = ThreadService()
    list(
        thread_service.stream(
            "thread-1",
            type("Req", (), {
                "messages": [{"type": "human", "content": "文章中写了啥"}],
                "context": {
                    "agent_name": "notebook-chat",
                    "notebook_note_id": note.note_id,
                    "notebook_note_title": note.title,
                    "notebook_session_id": "session-1",
                },
                "config": {},
                "assistant_id": None,
            })(),
        )
    )

    assert captured["kwargs"]["agent_name"] == "notebook-chat"
