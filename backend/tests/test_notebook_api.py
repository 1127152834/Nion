from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths


def test_notebook_api_round_trips_note_lifecycle(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "projects/alpha", "title": "Roadmap", "body": "v1"},
        )
        assert created.status_code == 200
        created_payload = created.json()["note"]
        note_id = created_payload["note_id"]

        tree = client.get("/api/notebook/tree")
        assert tree.status_code == 200
        assert any(item["path"] == "projects/alpha/roadmap.md" for item in tree.json()["files"])

        loaded = client.get(f"/api/notebook/notes/{note_id}")
        assert loaded.status_code == 200
        assert loaded.json()["note"]["title"] == "Roadmap"
        assert loaded.json()["note"]["tags"] == []
        assert loaded.json()["note"]["is_pinned"] is False

        updated = client.put(
            f"/api/notebook/notes/{note_id}",
            json={
                "body": "v2",
                "expected_content_hash": created_payload["content_hash"],
            },
        )
        assert updated.status_code == 200

        renamed = client.post(
            f"/api/notebook/notes/{note_id}/rename",
            json={"title": "Roadmap V2"},
        )
        assert renamed.status_code == 200
        assert renamed.json()["note"]["relative_path"] == "projects/alpha/roadmap-v2.md"

        moved = client.post(
            f"/api/notebook/notes/{note_id}/move",
            json={"directory": "projects/archive"},
        )
        assert moved.status_code == 200
        assert moved.json()["note"]["relative_path"] == "projects/archive/roadmap-v2.md"

        history = client.get(f"/api/notebook/notes/{note_id}/history")
        assert history.status_code == 200
        assert history.json()["entries"][0]["operation"] == "move"
        assert "diff_text" in history.json()["entries"][0]

        delete_preview = client.get(f"/api/notebook/notes/{note_id}/delete-preview")
        assert delete_preview.status_code == 200
        assert delete_preview.json()["title"] == "Roadmap V2"

        deleted = client.post(f"/api/notebook/notes/{note_id}/delete")
        assert deleted.status_code == 200
        assert deleted.json()["deleted"]["note_id"] == note_id

        restored = client.post(f"/api/notebook/notes/{note_id}/restore-deleted")
        assert restored.status_code == 200
        assert restored.json()["note"]["note_id"] == note_id


def test_notebook_tree_ignores_hidden_notebook_metadata(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Visible Note", "body": "body"},
        )
        assert created.status_code == 200

        tree = client.get("/api/notebook/tree")
        payload = tree.json()

        assert all(".nion" not in item["path"] for item in payload["directories"])
        assert all(".nion" not in item["path"] for item in payload["files"])


def test_notebook_notes_list_ignores_hidden_paths(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Visible Note", "body": "body"},
        )
        assert created.status_code == 200

        hidden_dir = tmp_path / "notebook" / ".private"
        hidden_dir.mkdir(parents=True, exist_ok=True)
        (hidden_dir / "secret.md").write_text(
            "---\nid: note_hidden\ntitle: Secret\ncreated_at: 2026-03-27T00:00:00Z\nupdated_at: 2026-03-27T00:00:00Z\ntags: []\n---\n\nsecret\n",
            encoding="utf-8",
        )

        listed = client.get("/api/notebook/notes")
        assert listed.status_code == 200
        payload = listed.json()

        assert [item["title"] for item in payload["notes"]] == ["Visible Note"]


def test_notebook_trash_lists_deleted_notes(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Trash Note", "body": "body"},
        )
        assert created.status_code == 200
        note_id = created.json()["note"]["note_id"]

        deleted = client.post(f"/api/notebook/notes/{note_id}/delete")
        assert deleted.status_code == 200

        trash = client.get("/api/notebook/trash")
        assert trash.status_code == 200
        payload = trash.json()
        assert payload["notes"][0]["note_id"] == note_id


def test_notebook_notes_list_exposes_summary_and_metadata(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "projects/alpha", "title": "Roadmap", "body": "Alpha launch summary"},
        )
        assert created.status_code == 200

        listed = client.get("/api/notebook/notes")
        assert listed.status_code == 200
        payload = listed.json()

        assert len(payload["notes"]) == 1
        note = payload["notes"][0]
        assert note["title"] == "Roadmap"
        assert note["relative_path"] == "projects/alpha/roadmap.md"
        assert note["summary"] == "Alpha launch summary"
        assert note["tags"] == []
        assert note["is_pinned"] is False


def test_notebook_metadata_patch_updates_tags_and_pin_state(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "projects/alpha", "title": "Roadmap", "body": "Alpha launch summary"},
        )
        assert created.status_code == 200
        note_id = created.json()["note"]["note_id"]

        updated = client.patch(
            f"/api/notebook/notes/{note_id}/metadata",
            json={"tags": ["alpha", "roadmap"], "is_pinned": True},
        )
        assert updated.status_code == 200
        payload = updated.json()["note"]
        assert payload["tags"] == ["alpha", "roadmap"]
        assert payload["is_pinned"] is True

        loaded = client.get(f"/api/notebook/notes/{note_id}")
        assert loaded.status_code == 200
        assert loaded.json()["note"]["tags"] == ["alpha", "roadmap"]
        assert loaded.json()["note"]["is_pinned"] is True

        listed = client.get("/api/notebook/notes")
        assert listed.status_code == 200
        summary = listed.json()["notes"][0]
        assert summary["tags"] == ["alpha", "roadmap"]
        assert summary["is_pinned"] is True


def test_notebook_history_detail_returns_snapshot_content(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "History Note", "body": "v1"},
        )
        assert created.status_code == 200
        note_id = created.json()["note"]["note_id"]

        updated = client.put(
            f"/api/notebook/notes/{note_id}",
            json={
                "body": "v2",
                "expected_content_hash": created.json()["note"]["content_hash"],
            },
        )
        assert updated.status_code == 200

        history = client.get(f"/api/notebook/notes/{note_id}/history")
        assert history.status_code == 200
        version_id = history.json()["entries"][0]["version_id"]

        detail = client.get(f"/api/notebook/notes/{note_id}/history/{version_id}")
        assert detail.status_code == 200
        payload = detail.json()

        assert payload["entry"]["version_id"] == version_id
        assert payload["snapshot"]["title"] == "History Note"
        assert payload["snapshot"]["body"] == "v2"


def test_notebook_assist_preview_and_apply(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Assist Note", "body": "line one\nline two"},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        preview = client.post(
            f"/api/notebook/notes/{note_id}/assist-preview",
            json={"action": "summarize"},
        )
        assert preview.status_code == 200
        preview_payload = preview.json()
        assert preview_payload["action"] == "summarize"
        assert preview_payload["content"]
        assert preview_payload["original_content"] == "line one\nline two"

        applied = client.post(
            f"/api/notebook/notes/{note_id}/assist-apply",
            json={
                "action": "summarize",
                "mode": "replace",
                "content": preview_payload["content"],
                "expected_content_hash": note["content_hash"],
            },
        )
        assert applied.status_code == 200
        applied_note = applied.json()["note"]
        assert applied_note["body"] == preview_payload["content"]

        history = client.get(f"/api/notebook/notes/{note_id}/history")
        assert history.status_code == 200
        assert history.json()["entries"][0]["actor_type"] == "agent"
        assert history.json()["entries"][0]["operation"] == "edit"


def test_notebook_import_updates_current_note(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Import Note", "body": "line one"},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        imported = client.post(
            f"/api/notebook/notes/{note_id}/import",
            json={
                "source": "chat",
                "content": "imported block",
                "mode": "append",
                "expected_content_hash": note["content_hash"],
            },
        )
        assert imported.status_code == 200
        imported_note = imported.json()["note"]
        assert "imported block" in imported_note["body"]

        history = client.get(f"/api/notebook/notes/{note_id}/history")
        assert history.status_code == 200
        assert history.json()["entries"][0]["actor_type"] == "agent"


def test_notebook_directory_api_round_trip(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/directories",
            json={"parent_directory": "projects", "name": "alpha"},
        )
        assert created.status_code == 200
        assert created.json()["directory"] == "projects/alpha"

        tree = client.get("/api/notebook/tree")
        assert tree.status_code == 200
        assert any(item["path"] == "projects/alpha" for item in tree.json()["directories"])

        renamed = client.post(
            "/api/notebook/directories/rename",
            json={"directory": "projects/alpha", "name": "beta"},
        )
        assert renamed.status_code == 200
        assert renamed.json()["directory"] == "projects/beta"

        tree = client.get("/api/notebook/tree")
        assert tree.status_code == 200
        assert any(item["path"] == "projects/beta" for item in tree.json()["directories"])
        assert all(item["path"] != "projects/alpha" for item in tree.json()["directories"])

        deleted = client.post(
            "/api/notebook/directories/delete",
            json={"directory": "projects/beta"},
        )
        assert deleted.status_code == 200
        assert deleted.json()["directory"] == "projects/beta"

        tree = client.get("/api/notebook/tree")
        assert tree.status_code == 200
        assert all(item["path"] != "projects/beta" for item in tree.json()["directories"])


def test_notebook_directory_delete_rejects_non_empty_folder(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "projects/alpha", "title": "Roadmap", "body": "v1"},
        )
        assert created.status_code == 200

        deleted = client.post(
            "/api/notebook/directories/delete",
            json={"directory": "projects/alpha"},
        )
        assert deleted.status_code == 409


def test_notebook_directory_create_rejects_existing_folder(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/directories",
            json={"parent_directory": "projects", "name": "alpha"},
        )
        assert created.status_code == 200

        duplicated = client.post(
            "/api/notebook/directories",
            json={"parent_directory": "projects", "name": "alpha"},
        )
        assert duplicated.status_code == 409
