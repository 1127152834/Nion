from pathlib import Path

import pytest

from nion.notebook.service import (
    NotebookConflictError,
    NotebookDirectoryAlreadyExistsError,
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


def test_update_note_rejects_stale_content_hash(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    created = service.create_note(directory="", title="Conflict Note", body="one")

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
