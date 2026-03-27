from __future__ import annotations

import hashlib
import re
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path

from nion.config.paths import Paths, get_paths
from nion.notebook.frontmatter import render_frontmatter, split_frontmatter
from nion.notebook.models import NotebookNote, NotebookNoteSummary


class NotebookError(Exception):
    """Base notebook error."""


class NotebookNotFoundError(NotebookError):
    """Raised when a note cannot be found."""


class NotebookConflictError(NotebookError):
    """Raised when a stale write would overwrite newer content."""


class NotebookDirectoryNotFoundError(NotebookError):
    """Raised when a notebook directory cannot be found."""


class NotebookDirectoryNotEmptyError(NotebookError):
    """Raised when attempting to delete a non-empty notebook directory."""


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


def is_visible_notebook_relative_path(path: Path) -> bool:
    return ".nion" not in path.parts and not any(part.startswith(".") for part in path.parts)


class NotebookService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir) if base_dir is not None else get_paths()
        self._paths.ensure_notebook_dirs()
        self._metadata_db_path = self._paths.notebook_meta_dir / "metadata.sqlite3"
        self._init_metadata_schema()

    def _connect_metadata(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._metadata_db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        return conn

    def _init_metadata_schema(self) -> None:
        with self._connect_metadata() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS notebook_note_metadata (
                    note_id TEXT PRIMARY KEY,
                    is_pinned INTEGER NOT NULL DEFAULT 0
                );
                """
            )

    def _read_pinned_state(self, note_id: str) -> bool:
        with self._connect_metadata() as conn:
            row = conn.execute(
                "SELECT is_pinned FROM notebook_note_metadata WHERE note_id = ?",
                (note_id,),
            ).fetchone()
        return bool(row["is_pinned"]) if row else False

    def _write_pinned_state(self, note_id: str, *, is_pinned: bool) -> None:
        with self._connect_metadata() as conn:
            conn.execute(
                """
                INSERT INTO notebook_note_metadata(note_id, is_pinned)
                VALUES (?, ?)
                ON CONFLICT(note_id) DO UPDATE SET is_pinned = excluded.is_pinned
                """,
                (note_id, int(is_pinned)),
            )

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

    def _visible_relative_dir(self, path: Path) -> Path:
        relative = path.resolve().relative_to(self._paths.notebook_root_dir.resolve())
        if relative == Path("."):
            return relative
        if not is_visible_notebook_relative_path(relative):
            raise ValueError("Notebook hidden directories are not allowed")
        return relative

    def _normalize_directory_name(self, name: str) -> str:
        stripped = name.strip().strip("/")
        if not stripped:
            raise ValueError("Notebook directory name is required")
        if "/" in stripped or "\\" in stripped:
            raise ValueError("Notebook directory name must be a single path segment")
        if stripped in {".", ".."} or stripped.startswith("."):
            raise ValueError("Notebook hidden directories are not allowed")
        return stripped

    def _attachment_dir_for_path(self, path: Path, note_id: str) -> Path:
        return path.parent / ".assets" / note_id

    def _build_note(self, path: Path) -> NotebookNote:
        text = path.read_text(encoding="utf-8")
        frontmatter, body = split_frontmatter(text)
        tags = frontmatter.get("tags")
        normalized_tags = [str(tag) for tag in tags] if isinstance(tags, list) else []
        return NotebookNote(
            note_id=str(frontmatter["id"]),
            title=str(frontmatter["title"]),
            relative_path=self._relative_path(path),
            absolute_path=str(path.resolve()),
            created_at=str(frontmatter["created_at"]),
            updated_at=str(frontmatter["updated_at"]),
            content_hash=_hash_text(text),
            body=body.lstrip("\n").rstrip("\n"),
            tags=normalized_tags,
            is_pinned=self._read_pinned_state(str(frontmatter["id"])),
        )

    def _write_note(self, path: Path, *, note_id: str, title: str, created_at: str, updated_at: str, body: str, tags: list[str] | None = None) -> NotebookNote:
        path.parent.mkdir(parents=True, exist_ok=True)
        text = render_frontmatter(
            {
                "id": note_id,
                "title": title,
                "created_at": created_at,
                "updated_at": updated_at,
                "tags": tags or [],
            },
            body,
        )
        path.write_text(text, encoding="utf-8")
        return self._build_note(path)

    def _find_note_path(self, note_id: str) -> Path:
        for path in self._paths.notebook_root_dir.rglob("*.md"):
            relative = path.resolve().relative_to(self._paths.notebook_root_dir.resolve())
            if not is_visible_notebook_relative_path(relative):
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
            tags=[],
        )

    def create_directory(self, *, parent_directory: str, name: str) -> str:
        parent = self._resolve_directory(parent_directory)
        self._visible_relative_dir(parent)
        target = parent / self._normalize_directory_name(name)
        relative = self._visible_relative_dir(target)
        target.mkdir(parents=True, exist_ok=True)
        return relative.as_posix()

    def rename_directory(self, directory: str, name: str) -> str:
        current = self._resolve_directory(directory)
        current_relative = self._visible_relative_dir(current)
        if current_relative == Path("."):
            raise ValueError("Notebook root directory cannot be renamed")
        if not current.exists() or not current.is_dir():
            raise NotebookDirectoryNotFoundError(f"Notebook directory not found: {directory}")

        target = current.parent / self._normalize_directory_name(name)
        target_relative = self._visible_relative_dir(target)
        if target.exists() and target != current:
            raise ValueError(f"Notebook directory already exists: {target_relative.as_posix()}")
        if target != current:
            current.rename(target)
        return target_relative.as_posix()

    def delete_directory(self, directory: str) -> None:
        target = self._resolve_directory(directory)
        relative = self._visible_relative_dir(target)
        if relative == Path("."):
            raise ValueError("Notebook root directory cannot be deleted")
        if not target.exists() or not target.is_dir():
            raise NotebookDirectoryNotFoundError(f"Notebook directory not found: {directory}")
        if any(target.iterdir()):
            raise NotebookDirectoryNotEmptyError(
                f"Notebook directory is not empty: {relative.as_posix()}"
            )
        target.rmdir()

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
            tags=current.tags,
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
            tags=current.tags,
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
            tags=current.tags,
        )

    def list_note_summaries(self) -> list[NotebookNoteSummary]:
        summaries: list[NotebookNoteSummary] = []
        for path in sorted(self._paths.notebook_root_dir.rglob("*.md"), key=lambda item: item.as_posix().lower()):
            relative = path.resolve().relative_to(self._paths.notebook_root_dir.resolve())
            if not is_visible_notebook_relative_path(relative):
                continue
            note = self._build_note(path)
            compact = " ".join(note.body.strip().split())
            summary = compact[:140] + ("..." if len(compact) > 140 else "")
            summaries.append(
                NotebookNoteSummary(
                    note_id=note.note_id,
                    title=note.title,
                    relative_path=note.relative_path,
                    created_at=note.created_at,
                    updated_at=note.updated_at,
                    summary=summary,
                    tags=note.tags,
                    is_pinned=note.is_pinned,
                )
            )
        return summaries

    def note_attachment_dir(self, note_id: str) -> Path:
        note_path = self._find_note_path(note_id)
        attachment_dir = self._attachment_dir_for_path(note_path, note_id)
        attachment_dir.mkdir(parents=True, exist_ok=True)
        return attachment_dir

    def update_note_metadata(
        self,
        note_id: str,
        *,
        tags: list[str] | None = None,
        is_pinned: bool | None = None,
    ) -> NotebookNote:
        current = self.read_note(note_id)
        next_tags = current.tags if tags is None else [str(tag) for tag in tags]
        note = self._write_note(
            Path(current.absolute_path),
            note_id=current.note_id,
            title=current.title,
            created_at=current.created_at,
            updated_at=_now_iso(),
            body=current.body,
            tags=next_tags,
        )
        if is_pinned is not None:
            self._write_pinned_state(note.note_id, is_pinned=is_pinned)
        return self.read_note(note_id)
