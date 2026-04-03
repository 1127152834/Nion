from pathlib import Path

import pytest

from nion.notebook.service import (
    NotebookConflictError,
    NotebookDirectoryAlreadyExistsError,
    NotebookDirectoryMoveError,
    NotebookDirectoryNotEmptyError,
    NotebookService,
)


def test_create_note_writes_markdown_with_required_frontmatter(tmp_path):
    service = NotebookService(base_dir=tmp_path)

    note = service.create_note(
        directory="projects/alpha",
        title="Roadmap",
        body="Initial content",
    )

    note_path = Path(note.absolute_path)
    content = note_path.read_text(encoding="utf-8")

    assert note_path == tmp_path / "notebook" / "projects" / "alpha" / "roadmap.md"
    assert "id:" in content
    assert "title: Roadmap" in content
    assert "created_at:" in content
    assert "updated_at:" in content
    assert content.rstrip().endswith("Initial content")


def test_update_note_preserves_id_and_changes_updated_at(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    created = service.create_note(directory="", title="My Note", body="one")

    assert created.relative_path == "收件箱/my-note.md"

    updated = service.update_note(
        note_id=created.note_id,
        body="two",
        expected_content_hash=created.content_hash,
    )

    assert updated.note_id == created.note_id
    assert updated.created_at == created.created_at
    assert updated.updated_at != created.updated_at
    assert updated.content_hash != created.content_hash
    assert Path(updated.absolute_path).read_text(encoding="utf-8").rstrip().endswith("two")


def test_rename_and_move_note_preserve_identity(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    created = service.create_note(directory="projects", title="Alpha Plan", body="body")

    renamed = service.rename_note(created.note_id, "Alpha Plan V2")
    moved = service.move_note(created.note_id, "projects/archive")

    assert renamed.note_id == created.note_id
    assert renamed.relative_path == "projects/alpha-plan-v2.md"
    assert moved.note_id == created.note_id
    assert moved.relative_path == "projects/archive/alpha-plan-v2.md"


def test_attachment_directory_uses_hidden_assets_folder(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    created = service.create_note(directory="projects", title="Asset Note", body="body")

    attachment_dir = service.note_attachment_dir(created.note_id)

    assert attachment_dir == tmp_path / "notebook" / "projects" / ".assets" / created.note_id


def test_move_note_moves_existing_attachment_directory(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    created = service.create_note(directory="projects", title="Move Assets", body="body")
    attachment_dir = service.note_attachment_dir(created.note_id)
    asset = attachment_dir / "image.png"
    asset.write_text("png", encoding="utf-8")

    moved = service.move_note(created.note_id, "projects/archive")
    moved_attachment_dir = service.note_attachment_dir(created.note_id)

    assert moved.relative_path == "projects/archive/move-assets.md"
    assert not attachment_dir.exists()
    assert (moved_attachment_dir / "image.png").exists()


def test_archive_workspace_asset_creates_notebook_copy(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    source = tmp_path / "threads" / "thread-1" / "user-data" / "outputs" / "report.html"
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text("<h1>Report</h1>", encoding="utf-8")

    asset = service.archive_asset(source_path=str(source), directory="")

    assert asset.relative_path.startswith("收件箱/")
    assert asset.source_kind == "workspace_copy"
    assert Path(asset.absolute_path).read_text(encoding="utf-8") == "<h1>Report</h1>"


def test_list_inbox_items_includes_archived_assets(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    source = tmp_path / "workspace" / "snapshot.html"
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text("<p>snapshot</p>", encoding="utf-8")

    note = service.create_note(directory="", title="Inbox Note", body="body")
    asset = service.archive_asset(source_path=str(source), directory="")
    items = service.list_inbox_items()

    assert {item.entry_type for item in items} == {"note", "asset"}
    assert any(item.note_id == note.note_id for item in items)
    assert any(item.asset_id == asset.asset_id for item in items)


def test_move_asset_moves_archived_copy_into_target_directory(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    source = tmp_path / "workspace" / "snapshot.html"
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text("<p>snapshot</p>", encoding="utf-8")

    asset = service.archive_asset(source_path=str(source), directory="")
    moved = service.move_asset(asset.asset_id, "资料归档")

    assert moved.asset_id == asset.asset_id
    assert moved.relative_path == "资料归档/snapshot.html"
    assert Path(moved.absolute_path).read_text(encoding="utf-8") == "<p>snapshot</p>"


def test_update_note_rejects_stale_content_hash(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    created = service.create_note(directory="", title="Conflict Note", body="one")

    assert created.relative_path == "收件箱/conflict-note.md"

    service.update_note(
        note_id=created.note_id,
        body="two",
        expected_content_hash=created.content_hash,
    )

    with pytest.raises(NotebookConflictError):
        service.update_note(
            note_id=created.note_id,
            body="three",
            expected_content_hash=created.content_hash,
        )


def test_create_directory_creates_empty_folder_and_returns_relative_path(tmp_path):
    service = NotebookService(base_dir=tmp_path)

    created = service.create_directory(parent_directory="projects", name="alpha")

    assert created == "projects/alpha"
    assert (tmp_path / "notebook" / "projects" / "alpha").is_dir()


def test_create_directory_rejects_existing_folder(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    service.create_directory(parent_directory="projects", name="alpha")

    with pytest.raises(NotebookDirectoryAlreadyExistsError):
        service.create_directory(parent_directory="projects", name="alpha")


def test_rename_directory_moves_visible_folder_and_returns_new_relative_path(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    service.create_directory(parent_directory="", name="projects")
    service.create_directory(parent_directory="projects", name="alpha")

    renamed = service.rename_directory(directory="projects/alpha", name="beta")

    assert renamed == "projects/beta"
    assert not (tmp_path / "notebook" / "projects" / "alpha").exists()
    assert (tmp_path / "notebook" / "projects" / "beta").is_dir()


def test_delete_directory_rejects_non_empty_folder(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    service.create_note(directory="projects/alpha", title="Roadmap", body="v1")

    with pytest.raises(NotebookDirectoryNotEmptyError):
        service.delete_directory("projects/alpha")


def test_move_directory_moves_subtree_to_new_parent(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    service.create_directory(parent_directory="", name="projects")
    service.create_directory(parent_directory="", name="archive")
    service.create_directory(parent_directory="projects", name="alpha")
    moved = service.move_directory(directory="projects/alpha", parent_directory="archive")

    assert moved == "archive/alpha"
    assert not (tmp_path / "notebook" / "projects" / "alpha").exists()
    assert (tmp_path / "notebook" / "archive" / "alpha").is_dir()


def test_move_directory_rejects_descendant_target(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    service.create_directory(parent_directory="", name="projects")
    service.create_directory(parent_directory="projects", name="alpha")
    service.create_directory(parent_directory="projects/alpha", name="nested")

    with pytest.raises(NotebookDirectoryMoveError):
        service.move_directory(directory="projects/alpha", parent_directory="projects/alpha/nested")
