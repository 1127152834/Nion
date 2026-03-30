from fastapi.testclient import TestClient

from app.gateway.routers import notebook as notebook_router
from app.daemon.app import create_app
from nion.config.paths import reset_paths
from nion.threads.repository import ThreadRepository


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

    class FakeModel:
        def invoke(self, prompt: str):
            assert "Assist Note" in prompt
            return type(
                "FakeResponse",
                (),
                {
                    "content": "## 一句话总结\n- 已生成真实摘要",
                },
            )()

    monkeypatch.setattr(
        notebook_router,
        "create_chat_model",
        lambda **kwargs: FakeModel(),
        raising=False,
    )
    monkeypatch.setattr(
        notebook_router,
        "resolve_model_name_with_fallback",
        lambda *args, **kwargs: "test-model",
        raising=False,
    )

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
        assert preview_payload["kind"] == "derived"
        assert preview_payload["action_label"] == "生成摘要"
        assert preview_payload["recommended_mode"] == "insert"
        assert preview_payload["available_modes"] == ["insert", "replace"]
        assert preview_payload["content"] == "## 一句话总结\n- 已生成真实摘要"
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


def test_notebook_import_sources_lists_recent_assistant_replies(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread(
        "thread-1",
        title="Alpha 讨论",
        values={
            "title": "Alpha 讨论",
            "messages": [
                {"type": "human", "content": "帮我写一下总结"},
                {
                    "type": "ai",
                    "id": "ai-1",
                    "content": [{"type": "text", "text": "这是 Alpha 的第一版总结。"}],
                },
            ],
            "artifacts": [],
        },
    )
    repository.upsert_thread(
        "thread-2",
        title="Beta 计划",
        values={
            "title": "Beta 计划",
            "messages": [
                {"type": "human", "content": "整理行动项"},
                {
                    "type": "ai",
                    "id": "ai-2",
                    "content": "Beta 的行动项如下：先调研，再排期。",
                },
            ],
            "artifacts": [],
        },
    )
    repository.upsert_thread(
        "thread-3",
        title="仅用户消息",
        values={
            "title": "仅用户消息",
            "messages": [{"type": "human", "content": "这里只有用户消息"}],
            "artifacts": [],
        },
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/notebook/import-sources?source=chat")
        assert response.status_code == 200
        payload = response.json()

        assert [item["thread_id"] for item in payload["items"]] == ["thread-3", "thread-2", "thread-1"][1:]
        assert payload["items"][0]["thread_title"] == "Beta 计划"
        assert payload["items"][0]["preview_text"] == "Beta 的行动项如下：先调研，再排期。"
        assert payload["items"][0]["content"] == "Beta 的行动项如下：先调研，再排期。"
        assert payload["items"][0]["source"] == "chat"
        assert payload["items"][1]["thread_title"] == "Alpha 讨论"
        assert payload["items"][1]["preview_text"] == "这是 Alpha 的第一版总结。"


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


def test_notebook_assist_supports_selection_scope_and_selection_apply(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    class FakeModel:
        def invoke(self, prompt: str):
            assert "当前选中内容" in prompt
            assert "line one" in prompt
            return type(
                "FakeResponse",
                (),
                {
                    "content": "line one, but clearer",
                },
            )()

    monkeypatch.setattr(
        notebook_router,
        "create_chat_model",
        lambda **kwargs: FakeModel(),
        raising=False,
    )
    monkeypatch.setattr(
        notebook_router,
        "resolve_model_name_with_fallback",
        lambda *args, **kwargs: "test-model",
        raising=False,
    )

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Assist Selection", "body": "line one\nline two"},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        preview = client.post(
            f"/api/notebook/notes/{note_id}/assist-preview",
            json={
                "action": "rewrite",
                "body": "line one\nline two",
                "scope": "selection",
                "selection_start": 0,
                "selection_end": 8,
            },
        )
        assert preview.status_code == 200
        preview_payload = preview.json()
        assert preview_payload["scope"] == "selection"
        assert preview_payload["source_excerpt"] == "line one"
        assert preview_payload["recommended_mode"] == "replace_selection"
        assert preview_payload["available_modes"] == ["replace_selection", "insert_after_selection"]

        applied = client.post(
            f"/api/notebook/notes/{note_id}/assist-apply",
            json={
                "action": "rewrite",
                "mode": "replace_selection",
                "content": preview_payload["content"],
                "expected_content_hash": note["content_hash"],
                "current_body": "line one\nline two",
                "selection_start": 0,
                "selection_end": 8,
            },
        )
        assert applied.status_code == 200
        applied_note = applied.json()["note"]
        assert applied_note["body"] == "line one, but clearer\nline two"


def test_notebook_assist_supports_paragraph_scope_and_action_options(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    class FakeModel:
        def invoke(self, prompt: str):
            assert "当前段落" in prompt
            assert "重写风格：更正式" in prompt
            assert "补充方向：补例子" in prompt
            assert "second paragraph" in prompt
            return type(
                "FakeResponse",
                (),
                {
                    "content": "expanded second paragraph with examples",
                },
            )()

    monkeypatch.setattr(
        notebook_router,
        "create_chat_model",
        lambda **kwargs: FakeModel(),
        raising=False,
    )
    monkeypatch.setattr(
        notebook_router,
        "resolve_model_name_with_fallback",
        lambda *args, **kwargs: "test-model",
        raising=False,
    )

    body = "first paragraph\n\nsecond paragraph\nwith more lines\n\nthird paragraph"

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Assist Paragraph", "body": body},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        preview = client.post(
            f"/api/notebook/notes/{note_id}/assist-preview",
            json={
                "action": "expand",
                "title": "Assist Paragraph",
                "body": body,
                "scope": "paragraph",
                "selection_start": 18,
                "selection_end": 18,
                "options": {
                    "rewrite_tone": "formal",
                    "expansion_intent": "examples",
                },
            },
        )
        assert preview.status_code == 200
        preview_payload = preview.json()
        assert preview_payload["scope"] == "paragraph"
        assert preview_payload["source_excerpt"] == "second paragraph with more lines"
        assert preview_payload["recommended_mode"] == "insert_after_selection"


def test_notebook_rewrite_apply_overwrites_existing_pending_rewrite(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Rewrite Note", "body": "line one\nline two"},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        first = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/apply",
            json={
                "content": "first rewrite",
                "expected_content_hash": note["content_hash"],
                "selection_start": 0,
                "selection_end": 8,
            },
        )
        assert first.status_code == 200
        first_payload = first.json()
        assert first_payload["note"]["body"] == "first rewrite\nline two"
        assert first_payload["pending_rewrite"]["original_content"] == "line one\nline two"
        assert first_payload["pending_rewrite"]["applied_content"] == "first rewrite\nline two"
        assert first_payload["pending_rewrite"]["selection_start"] == 0
        assert first_payload["pending_rewrite"]["selection_end"] == 8

        second = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/apply",
            json={
                "content": "second rewrite",
                "expected_content_hash": note["content_hash"],
                "selection_start": 9,
                "selection_end": 17,
            },
        )
        assert second.status_code == 200
        second_payload = second.json()
        assert second_payload["note"]["body"] == "line one\nsecond rewrite"
        assert second_payload["pending_rewrite"]["original_content"] == "line one\nline two"
        assert second_payload["pending_rewrite"]["applied_content"] == "line one\nsecond rewrite"
        assert second_payload["pending_rewrite"]["selection_start"] == 9
        assert second_payload["pending_rewrite"]["selection_end"] == 17

        reloaded = client.get(f"/api/notebook/notes/{note_id}")
        assert reloaded.status_code == 200
        assert reloaded.json()["note"]["body"] == "line one\nsecond rewrite"
        assert reloaded.json()["pending_rewrite"] == {
            "note_id": note_id,
            "original_content": "line one\nline two",
            "original_content_hash": note["content_hash"],
            "applied_content": "line one\nsecond rewrite",
            "selection_start": 9,
            "selection_end": 17,
            "updated_at": second_payload["pending_rewrite"]["updated_at"],
        }


def test_notebook_rewrite_cancel_discards_pending_rewrite(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Cancel Rewrite", "body": "draft body"},
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
        assert applied.json()["pending_rewrite"]["applied_content"] == "clean body"

        cancelled = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/cancel",
            json={},
        )
        assert cancelled.status_code == 200
        cancelled_payload = cancelled.json()
        assert cancelled_payload["note"]["body"] == "draft body"
        assert cancelled_payload["pending_rewrite"] is None


def test_notebook_rewrite_confirm_commits_pending_rewrite(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Confirm Rewrite", "body": "draft body"},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        applied = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/apply",
            json={
                "content": "final body",
                "expected_content_hash": note["content_hash"],
            },
        )
        assert applied.status_code == 200
        assert applied.json()["note"]["body"] == "final body"

        confirmed = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/confirm",
            json={},
        )
        assert confirmed.status_code == 200
        confirmed_payload = confirmed.json()
        assert confirmed_payload["note"]["body"] == "final body"
        assert confirmed_payload["pending_rewrite"] is None

        reloaded = client.get(f"/api/notebook/notes/{note_id}")
        assert reloaded.status_code == 200
        assert reloaded.json()["note"]["body"] == "final body"

        history = client.get(f"/api/notebook/notes/{note_id}/history")
        assert history.status_code == 200
        assert history.json()["entries"][0]["actor_type"] == "agent"


def test_notebook_rewrite_rejects_confirm_and_cancel_after_manual_edit(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/notes",
            json={"directory": "", "title": "Conflict Rewrite", "body": "draft body"},
        )
        assert created.status_code == 200
        note = created.json()["note"]
        note_id = note["note_id"]

        applied = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/apply",
            json={
                "content": "rewrite body",
                "expected_content_hash": note["content_hash"],
            },
        )
        assert applied.status_code == 200
        rewritten_note = applied.json()["note"]

        manual_update = client.put(
            f"/api/notebook/notes/{note_id}",
            json={
                "body": "manual body",
                "expected_content_hash": rewritten_note["content_hash"],
            },
        )
        assert manual_update.status_code == 200

        confirm = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/confirm",
            json={},
        )
        assert confirm.status_code == 409

        reapplied = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/apply",
            json={
                "content": "rewrite body 2",
                "expected_content_hash": manual_update.json()["note"]["content_hash"],
            },
        )
        assert reapplied.status_code == 200
        rewritten_note_2 = reapplied.json()["note"]

        second_manual_update = client.put(
            f"/api/notebook/notes/{note_id}",
            json={
                "body": "manual body 2",
                "expected_content_hash": rewritten_note_2["content_hash"],
            },
        )
        assert second_manual_update.status_code == 200

        cancel = client.post(
            f"/api/notebook/notes/{note_id}/rewrite/cancel",
            json={},
        )
        assert cancel.status_code == 409


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


def test_notebook_directory_move_updates_tree(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        client.post("/api/notebook/directories", json={"parent_directory": "", "name": "projects"})
        client.post("/api/notebook/directories", json={"parent_directory": "", "name": "archive"})
        created = client.post(
            "/api/notebook/directories",
            json={"parent_directory": "projects", "name": "alpha"},
        )
        assert created.status_code == 200

        moved = client.post(
            "/api/notebook/directories/move",
            json={"directory": "projects/alpha", "parent_directory": "archive"},
        )
        assert moved.status_code == 200
        assert moved.json()["directory"] == "archive/alpha"

        tree = client.get("/api/notebook/tree")
        payload = tree.json()
        assert any(item["path"] == "archive/alpha" for item in payload["directories"])
        assert all(item["path"] != "projects/alpha" for item in payload["directories"])
