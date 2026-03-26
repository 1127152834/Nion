from pathlib import Path

from nion.notebook.history import NotebookHistoryService


def test_history_service_records_create_edit_and_restore(tmp_path):
    service = NotebookHistoryService(base_dir=tmp_path)

    created = service.create_note(directory="", title="History Note", body="v1", actor_type="user")
    updated = service.update_note(
        note_id=created.note_id,
        body="v2",
        expected_content_hash=created.content_hash,
        actor_type="agent",
    )
    before_restore = service.list_history(created.note_id)
    create_entry = next(entry for entry in before_restore if entry.operation == "create")

    restored = service.restore_version(
        note_id=created.note_id,
        version_id=create_entry.version_id,
        actor_type="user",
    )

    history = service.list_history(created.note_id)

    assert updated.note_id == created.note_id
    assert restored.note_id == created.note_id
    assert Path(restored.absolute_path).read_text(encoding="utf-8").rstrip().endswith("v1")
    assert [entry.operation for entry in history] == ["restore", "edit", "create"]
    assert history[0].restored_from_version_id == create_entry.version_id


def test_delete_moves_note_to_trash_and_restore_returns_same_identity(tmp_path):
    service = NotebookHistoryService(base_dir=tmp_path)
    created = service.create_note(directory="projects", title="Delete Note", body="body", actor_type="user")
    attachment_dir = service._service.note_attachment_dir(created.note_id)
    asset = attachment_dir / "diagram.png"
    asset.write_text("png", encoding="utf-8")

    deleted = service.delete_note(created.note_id, actor_type="user")

    assert deleted.note_id == created.note_id
    assert not Path(created.absolute_path).exists()
    assert Path(deleted.trash_path).exists()
    assert not attachment_dir.exists()

    restored = service.restore_deleted_note(created.note_id, actor_type="user")
    history = service.list_history(created.note_id)
    restored_attachment_dir = service._service.note_attachment_dir(created.note_id)

    assert restored.note_id == created.note_id
    assert Path(restored.absolute_path).exists()
    assert (restored_attachment_dir / "diagram.png").exists()
    assert history[0].operation == "restore"
    assert history[1].operation == "delete"


def test_rename_and_move_are_recorded_in_history(tmp_path):
    service = NotebookHistoryService(base_dir=tmp_path)
    created = service.create_note(directory="projects", title="Alpha", body="body", actor_type="user")

    renamed = service.rename_note(created.note_id, "Beta", actor_type="agent")
    moved = service.move_note(created.note_id, "projects/archive", actor_type="agent")
    history = service.list_history(created.note_id)

    assert renamed.note_id == created.note_id
    assert moved.note_id == created.note_id
    assert [entry.operation for entry in history[:3]] == ["move", "rename", "create"]
    assert history[0].actor_type == "agent"
