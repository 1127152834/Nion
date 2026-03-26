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
