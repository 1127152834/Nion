from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel

from nion.config.paths import Paths, get_paths
from nion.notebook.assist import apply_assist_content
from nion.notebook.history import NotebookHistoryService
from nion.notebook.service import NotebookConflictError, NotebookNotFoundError, NotebookService


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class NotebookPendingRewrite(BaseModel):
    note_id: str
    original_content: str
    original_content_hash: str
    applied_content: str
    selection_start: int | None = None
    selection_end: int | None = None
    updated_at: str


class NotebookAssistantService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir) if base_dir is not None else get_paths()
        self._paths.ensure_notebook_dirs()
        self._service = NotebookService(base_dir=self._paths.base_dir)
        self._history_service = NotebookHistoryService(base_dir=self._paths.base_dir)
        self._db_path = self._paths.notebook_meta_dir / "metadata.sqlite3"
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
                CREATE TABLE IF NOT EXISTS notebook_pending_rewrites (
                    note_id TEXT PRIMARY KEY,
                    original_content TEXT NOT NULL,
                    original_content_hash TEXT NOT NULL,
                    applied_content TEXT NOT NULL,
                    selection_start INTEGER,
                    selection_end INTEGER,
                    updated_at TEXT NOT NULL
                );
                """
            )

    def get_pending_rewrite(self, note_id: str) -> NotebookPendingRewrite | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT note_id, original_content, original_content_hash, applied_content,
                       selection_start, selection_end, updated_at
                FROM notebook_pending_rewrites
                WHERE note_id = ?
                """,
                (note_id,),
            ).fetchone()
        return NotebookPendingRewrite.model_validate(dict(row)) if row else None

    def apply_rewrite(
        self,
        *,
        note_id: str,
        content: str,
        expected_content_hash: str,
        selection_start: int | None = None,
        selection_end: int | None = None,
    ):
        current_note = self._service.read_note(note_id)
        existing = self.get_pending_rewrite(note_id)
        if existing is None:
            if current_note.content_hash != expected_content_hash:
                raise NotebookConflictError("Notebook note was updated before applying rewrite.")
        else:
            if current_note.body != existing.applied_content:
                raise NotebookConflictError("Notebook note changed outside the pending rewrite flow.")
            if expected_content_hash not in {
                current_note.content_hash,
                existing.original_content_hash,
            }:
                raise NotebookConflictError("Notebook note was updated before applying rewrite.")

        original_content = existing.original_content if existing else current_note.body
        original_content_hash = (
            existing.original_content_hash if existing else current_note.content_hash
        )
        applied_content = apply_assist_content(
            original_body=original_content,
            generated_content=content,
            mode=(
                "replace_selection"
                if selection_start is not None and selection_end is not None
                else "replace"
            ),
            selection_start=selection_start,
            selection_end=selection_end,
        )
        pending = NotebookPendingRewrite(
            note_id=note_id,
            original_content=original_content,
            original_content_hash=original_content_hash,
            applied_content=applied_content,
            selection_start=selection_start,
            selection_end=selection_end,
            updated_at=_now_iso(),
        )
        note = self._history_service.update_note(
            note_id=note_id,
            body=applied_content,
            expected_content_hash=current_note.content_hash,
            actor_type="agent",
        )
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO notebook_pending_rewrites(
                    note_id, original_content, original_content_hash, applied_content,
                    selection_start, selection_end, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(note_id) DO UPDATE SET
                    original_content = excluded.original_content,
                    original_content_hash = excluded.original_content_hash,
                    applied_content = excluded.applied_content,
                    selection_start = excluded.selection_start,
                    selection_end = excluded.selection_end,
                    updated_at = excluded.updated_at
                """,
                (
                    pending.note_id,
                    pending.original_content,
                    pending.original_content_hash,
                    pending.applied_content,
                    pending.selection_start,
                    pending.selection_end,
                    pending.updated_at,
                ),
            )
        return note, pending

    def cancel_rewrite(self, note_id: str):
        pending = self.get_pending_rewrite(note_id)
        if pending is None:
            raise NotebookNotFoundError(f"Notebook pending rewrite not found: {note_id}")

        current_note = self._service.read_note(note_id)
        note = self._history_service.update_note(
            note_id=note_id,
            body=pending.original_content,
            expected_content_hash=current_note.content_hash,
            actor_type="agent",
        )
        self.clear_pending_rewrite(note_id)
        return note

    def clear_pending_rewrite(self, note_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM notebook_pending_rewrites WHERE note_id = ?",
                (note_id,),
            )

    def confirm_rewrite(self, note_id: str):
        pending = self.get_pending_rewrite(note_id)
        if pending is None:
            raise NotebookNotFoundError(f"Notebook pending rewrite not found: {note_id}")

        note = self._service.read_note(note_id)
        if note.body != pending.applied_content:
            raise NotebookConflictError("Notebook note no longer matches the pending rewrite.")
        self.clear_pending_rewrite(note_id)
        return note
