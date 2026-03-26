from __future__ import annotations

import hashlib
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path

from nion.config.paths import Paths, get_paths
from nion.notebook.frontmatter import render_frontmatter, split_frontmatter
from nion.notebook.models import NotebookNote


class NotebookError(Exception):
    """Base notebook error."""


class NotebookNotFoundError(NotebookError):
    """Raised when a note cannot be found."""


class NotebookConflictError(NotebookError):
    """Raised when a stale write would overwrite newer content."""


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE).strip().lower()
    normalized = re.sub(r"[-\s]+", "-", normalized)
    return normalized or "untitled-note"


def _note_id() -> str:
    return f"note_{datetime.now(UTC).strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"


class NotebookService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir) if base_dir is not None else get_paths()
        self._paths.ensure_notebook_dirs()

    def _resolve_directory(self, directory: str) -> Path:
        stripped = directory.strip().strip("/")
        root = self._paths.notebook_root_dir.resolve()
        target = (root / stripped).resolve() if stripped else root
        try:
            target.relative_to(root)
        except ValueError as exc:
            raise ValueError("Notebook directory traversal detected") from exc
        return target

    def _relative_path(self, path: Path) -> str:
        return path.resolve().relative_to(self._paths.notebook_root_dir.resolve()).as_posix()

    def _attachment_dir_for_path(self, path: Path, note_id: str) -> Path:
        return path.parent / ".assets" / note_id

    def _build_note(self, path: Path) -> NotebookNote:
        text = path.read_text(encoding="utf-8")
        frontmatter, body = split_frontmatter(text)
        return NotebookNote(
            note_id=str(frontmatter["id"]),
            title=str(frontmatter["title"]),
            relative_path=self._relative_path(path),
            absolute_path=str(path.resolve()),
            created_at=str(frontmatter["created_at"]),
            updated_at=str(frontmatter["updated_at"]),
            content_hash=_hash_text(text),
            body=body.rstrip("\n"),
        )

    def _write_note(self, path: Path, *, note_id: str, title: str, created_at: str, updated_at: str, body: str) -> NotebookNote:
        path.parent.mkdir(parents=True, exist_ok=True)
        text = render_frontmatter(
            {
                "id": note_id,
                "title": title,
                "created_at": created_at,
                "updated_at": updated_at,
            },
            body,
        )
        path.write_text(text, encoding="utf-8")
        return self._build_note(path)

    def _find_note_path(self, note_id: str) -> Path:
        for path in self._paths.notebook_root_dir.rglob("*.md"):
            if ".nion" in path.parts:
                continue
            try:
                frontmatter, _body = split_frontmatter(path.read_text(encoding="utf-8"))
            except OSError:
                continue
            if frontmatter.get("id") == note_id:
                return path
        raise NotebookNotFoundError(f"Notebook note not found: {note_id}")

    def create_note(self, *, directory: str, title: str, body: str) -> NotebookNote:
        target_dir = self._resolve_directory(directory)
        slug = _slugify(title)
        candidate = target_dir / f"{slug}.md"
        suffix = 2
        while candidate.exists():
            candidate = target_dir / f"{slug}-{suffix}.md"
            suffix += 1

        now = _now_iso()
        return self._write_note(
            candidate,
            note_id=_note_id(),
            title=title,
            created_at=now,
            updated_at=now,
            body=body,
        )

    def read_note(self, note_id: str) -> NotebookNote:
        return self._build_note(self._find_note_path(note_id))

    def update_note(self, *, note_id: str, body: str, expected_content_hash: str, title: str | None = None) -> NotebookNote:
        path = self._find_note_path(note_id)
        current = self._build_note(path)
        if current.content_hash != expected_content_hash:
            raise NotebookConflictError(f"Notebook note was modified concurrently: {note_id}")

        return self._write_note(
            path,
            note_id=current.note_id,
            title=title or current.title,
            created_at=current.created_at,
            updated_at=_now_iso(),
            body=body,
        )

    def rename_note(self, note_id: str, title: str) -> NotebookNote:
        current_path = self._find_note_path(note_id)
        current = self._build_note(current_path)
        renamed_path = current_path.with_name(f"{_slugify(title)}.md")
        if renamed_path != current_path:
            renamed_path.parent.mkdir(parents=True, exist_ok=True)
            current_path.rename(renamed_path)
        return self._write_note(
            renamed_path,
            note_id=current.note_id,
            title=title,
            created_at=current.created_at,
            updated_at=_now_iso(),
            body=current.body,
        )

    def move_note(self, note_id: str, directory: str) -> NotebookNote:
        current_path = self._find_note_path(note_id)
        current = self._build_note(current_path)
        target_dir = self._resolve_directory(directory)
        moved_path = target_dir / current_path.name
        current_attachment_dir = self._attachment_dir_for_path(current_path, note_id)
        moved_attachment_dir = self._attachment_dir_for_path(moved_path, note_id)
        if moved_path != current_path:
            moved_path.parent.mkdir(parents=True, exist_ok=True)
            current_path.rename(moved_path)
            if current_attachment_dir.exists() and current_attachment_dir != moved_attachment_dir:
                moved_attachment_dir.parent.mkdir(parents=True, exist_ok=True)
                current_attachment_dir.rename(moved_attachment_dir)
        return self._write_note(
            moved_path,
            note_id=current.note_id,
            title=current.title,
            created_at=current.created_at,
            updated_at=_now_iso(),
            body=current.body,
        )

    def note_attachment_dir(self, note_id: str) -> Path:
        note_path = self._find_note_path(note_id)
        attachment_dir = self._attachment_dir_for_path(note_path, note_id)
        attachment_dir.mkdir(parents=True, exist_ok=True)
        return attachment_dir
