from __future__ import annotations

import difflib
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path

from nion.config.paths import Paths, get_paths
from nion.notebook.frontmatter import split_frontmatter
from nion.notebook.models import (
    NotebookAsset,
    NotebookDeletedNote,
    NotebookDeletedNotePreview,
    NotebookHistoryEntry,
    NotebookNote,
)
from nion.notebook.service import NotebookService


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _version_id() -> str:
    return f"ver_{datetime.now(UTC).strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"


def _diff(before: str, after: str) -> str:
    return "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile="before.md",
            tofile="after.md",
        )
    )


class NotebookHistoryService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir) if base_dir is not None else get_paths()
        self._paths.ensure_notebook_dirs()
        self._service = NotebookService(base_dir=self._paths.base_dir)
        self._db_path = self._paths.notebook_meta_dir / "history.sqlite3"
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS notebook_versions (
                    id INTEGER PRIMARY KEY,
                    version_id TEXT NOT NULL UNIQUE,
                    note_id TEXT NOT NULL,
                    parent_version_id TEXT,
                    operation TEXT NOT NULL,
                    actor_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    path_at_time TEXT NOT NULL,
                    content_hash_after TEXT,
                    diff_text TEXT NOT NULL DEFAULT '',
                    content_snapshot TEXT NOT NULL DEFAULT '',
                    restored_from_version_id TEXT,
                    trash_path TEXT
                );

                CREATE INDEX IF NOT EXISTS notebook_versions_note_idx
                ON notebook_versions(note_id, id DESC);
                """
            )

    def _latest_entry(self, note_id: str) -> NotebookHistoryEntry | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT version_id, note_id, parent_version_id, operation, actor_type,
                       timestamp, path_at_time, content_hash_after, diff_text,
                       restored_from_version_id, trash_path
                FROM notebook_versions
                WHERE note_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (note_id,),
            ).fetchone()
        return NotebookHistoryEntry.model_validate(dict(row)) if row else None

    def _entry_snapshot(self, version_id: str) -> tuple[NotebookHistoryEntry, str]:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT version_id, note_id, parent_version_id, operation, actor_type,
                       timestamp, path_at_time, content_hash_after, diff_text,
                       content_snapshot, restored_from_version_id, trash_path
                FROM notebook_versions
                WHERE version_id = ?
                """,
                (version_id,),
            ).fetchone()
        if row is None:
            raise ValueError(f"Notebook history version not found: {version_id}")
        payload = dict(row)
        snapshot = str(payload.pop("content_snapshot"))
        payload.pop("diff_text", None)
        return NotebookHistoryEntry.model_validate(payload), snapshot

    def _record(
        self,
        *,
        note: NotebookNote,
        operation: str,
        actor_type: str,
        snapshot: str,
        before_snapshot: str = "",
        restored_from_version_id: str | None = None,
        trash_path: str | None = None,
    ) -> NotebookHistoryEntry:
        parent = self._latest_entry(note.note_id)
        entry = NotebookHistoryEntry(
            version_id=_version_id(),
            note_id=note.note_id,
            parent_version_id=parent.version_id if parent else None,
            operation=operation,
            actor_type=actor_type,
            timestamp=_now_iso(),
            path_at_time=note.relative_path,
            content_hash_after=note.content_hash,
            diff_text=_diff(before_snapshot, snapshot),
            restored_from_version_id=restored_from_version_id,
            trash_path=trash_path,
        )
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO notebook_versions(
                    version_id, note_id, parent_version_id, operation, actor_type,
                    timestamp, path_at_time, content_hash_after, diff_text,
                    content_snapshot, restored_from_version_id, trash_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry.version_id,
                    entry.note_id,
                    entry.parent_version_id,
                    entry.operation,
                    entry.actor_type,
                    entry.timestamp,
                    entry.path_at_time,
                    entry.content_hash_after,
                    entry.diff_text or "",
                    snapshot,
                    entry.restored_from_version_id,
                    entry.trash_path,
                ),
            )
        return entry

    def create_note(self, *, directory: str, title: str, body: str, actor_type: str) -> NotebookNote:
        note = self._service.create_note(directory=directory, title=title, body=body)
        snapshot = Path(note.absolute_path).read_text(encoding="utf-8")
        self._record(note=note, operation="create", actor_type=actor_type, snapshot=snapshot)
        return note

    def archive_asset(self, *, source_path: str, directory: str, actor_type: str) -> NotebookAsset:
        del actor_type
        return self._service.archive_asset(source_path=source_path, directory=directory)

    def update_note(self, *, note_id: str, body: str, expected_content_hash: str, actor_type: str, title: str | None = None) -> NotebookNote:
        before = self._service.read_note(note_id)
        before_snapshot = Path(before.absolute_path).read_text(encoding="utf-8")
        note = self._service.update_note(
            note_id=note_id,
            body=body,
            title=title,
            expected_content_hash=expected_content_hash,
        )
        snapshot = Path(note.absolute_path).read_text(encoding="utf-8")
        self._record(
            note=note,
            operation="edit",
            actor_type=actor_type,
            snapshot=snapshot,
            before_snapshot=before_snapshot,
        )
        return note

    def rename_note(self, note_id: str, title: str, actor_type: str) -> NotebookNote:
        before = self._service.read_note(note_id)
        before_snapshot = Path(before.absolute_path).read_text(encoding="utf-8")
        note = self._service.rename_note(note_id, title)
        snapshot = Path(note.absolute_path).read_text(encoding="utf-8")
        self._record(
            note=note,
            operation="rename",
            actor_type=actor_type,
            snapshot=snapshot,
            before_snapshot=before_snapshot,
        )
        return note

    def move_note(self, note_id: str, directory: str, actor_type: str) -> NotebookNote:
        before = self._service.read_note(note_id)
        before_snapshot = Path(before.absolute_path).read_text(encoding="utf-8")
        note = self._service.move_note(note_id, directory)
        snapshot = Path(note.absolute_path).read_text(encoding="utf-8")
        self._record(
            note=note,
            operation="move",
            actor_type=actor_type,
            snapshot=snapshot,
            before_snapshot=before_snapshot,
        )
        return note

    def restore_version(self, *, note_id: str, version_id: str, actor_type: str) -> NotebookNote:
        target_entry, snapshot = self._entry_snapshot(version_id)
        current = self._service.read_note(note_id)
        frontmatter, body = split_frontmatter(snapshot)
        note = self._service._write_note(
            Path(current.absolute_path),
            note_id=note_id,
            title=str(frontmatter.get("title") or current.title),
            created_at=str(frontmatter.get("created_at") or current.created_at),
            updated_at=_now_iso(),
            body=body.rstrip("\n"),
            tags=[str(tag) for tag in frontmatter.get("tags", [])] if isinstance(frontmatter.get("tags"), list) else current.tags,
        )
        new_snapshot = Path(note.absolute_path).read_text(encoding="utf-8")
        self._record(
            note=note,
            operation="restore",
            actor_type=actor_type,
            snapshot=new_snapshot,
            before_snapshot=Path(current.absolute_path).read_text(encoding="utf-8"),
            restored_from_version_id=target_entry.version_id,
        )
        return note

    def delete_note(self, note_id: str, actor_type: str) -> NotebookDeletedNote:
        note = self._service.read_note(note_id)
        snapshot = Path(note.absolute_path).read_text(encoding="utf-8")
        trash_dir = self._paths.notebook_trash_dir / note.note_id
        trash_dir.mkdir(parents=True, exist_ok=True)
        trash_path = trash_dir / Path(note.absolute_path).name
        attachment_dir = self._service._attachment_dir_for_path(
            Path(note.absolute_path),
            note.note_id,
        )
        attachment_trash_dir = trash_dir / ".assets" / note.note_id
        Path(note.absolute_path).rename(trash_path)
        if attachment_dir.exists():
            attachment_trash_dir.parent.mkdir(parents=True, exist_ok=True)
            attachment_dir.rename(attachment_trash_dir)

        self._record(
            note=note,
            operation="delete",
            actor_type=actor_type,
            snapshot=snapshot,
            before_snapshot=snapshot,
            trash_path=str(trash_path.resolve()),
        )

        return NotebookDeletedNote(note_id=note.note_id, trash_path=str(trash_path.resolve()))

    def restore_deleted_note(self, note_id: str, actor_type: str) -> NotebookNote:
        latest = self._latest_entry(note_id)
        if latest is None or latest.operation != "delete" or latest.trash_path is None:
            raise ValueError(f"Deleted notebook note not found: {note_id}")

        trash_path = Path(latest.trash_path)
        restore_path = self._paths.notebook_root_dir / latest.path_at_time
        restore_path.parent.mkdir(parents=True, exist_ok=True)
        attachment_restore_dir = self._service._attachment_dir_for_path(
            restore_path,
            note_id,
        )
        attachment_trash_dir = trash_path.parent / ".assets" / note_id
        trash_path.rename(restore_path)
        if attachment_trash_dir.exists():
            attachment_restore_dir.parent.mkdir(parents=True, exist_ok=True)
            attachment_trash_dir.rename(attachment_restore_dir)
        restored = self._service._build_note(restore_path)
        note = self._service._write_note(
            restore_path,
            note_id=restored.note_id,
            title=restored.title,
            created_at=restored.created_at,
            updated_at=_now_iso(),
            body=restored.body,
            tags=restored.tags,
        )
        snapshot = Path(note.absolute_path).read_text(encoding="utf-8")
        self._record(
            note=note,
            operation="restore",
            actor_type=actor_type,
            snapshot=snapshot,
            before_snapshot="",
            restored_from_version_id=latest.version_id,
        )
        return note

    def list_deleted_notes(self) -> list[NotebookDeletedNotePreview]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT note_id, path_at_time, timestamp, content_snapshot
                FROM notebook_versions
                WHERE operation = 'delete'
                ORDER BY id DESC
                """
            ).fetchall()

        deleted: list[NotebookDeletedNotePreview] = []
        seen: set[str] = set()
        for row in rows:
            note_id = str(row["note_id"])
            if note_id in seen:
                continue
            latest = self._latest_entry(note_id)
            if latest is None or latest.operation != "delete":
                continue
            snapshot = str(row["content_snapshot"])
            frontmatter, body = split_frontmatter(snapshot)
            summary = " ".join(body.strip().split())
            deleted.append(
                NotebookDeletedNotePreview(
                    note_id=note_id,
                    title=str(frontmatter.get("title") or note_id),
                    relative_path=str(row["path_at_time"]),
                    summary=summary[:140] + ("..." if len(summary) > 140 else ""),
                    deleted_at=str(row["timestamp"]),
                )
            )
            seen.add(note_id)
        return deleted

    def list_history(self, note_id: str) -> list[NotebookHistoryEntry]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT version_id, note_id, parent_version_id, operation, actor_type,
                       timestamp, path_at_time, content_hash_after, diff_text,
                       restored_from_version_id, trash_path
                FROM notebook_versions
                WHERE note_id = ?
                ORDER BY id DESC
                """,
                (note_id,),
            ).fetchall()
        return [NotebookHistoryEntry.model_validate(dict(row)) for row in rows]

    def get_history_detail(self, note_id: str, version_id: str) -> tuple[NotebookHistoryEntry, NotebookNote]:
        entry, snapshot = self._entry_snapshot(version_id)
        if entry.note_id != note_id:
            raise ValueError(f"Notebook history version not found for note: {version_id}")
        frontmatter, body = split_frontmatter(snapshot)
        return (
            entry,
            NotebookNote(
                note_id=str(frontmatter.get("id") or note_id),
                title=str(frontmatter.get("title") or ""),
                relative_path=entry.path_at_time,
                absolute_path="",
                created_at=str(frontmatter.get("created_at") or ""),
                updated_at=entry.timestamp,
                content_hash=entry.content_hash_after or "",
                body=body.lstrip("\n").rstrip("\n"),
                tags=[str(tag) for tag in frontmatter.get("tags", [])] if isinstance(frontmatter.get("tags"), list) else [],
                is_pinned=False,
            ),
        )
