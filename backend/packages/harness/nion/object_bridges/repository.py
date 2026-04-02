from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict
from pathlib import Path
from typing import Any

from nion.config.paths import Paths, get_paths

from .models import BridgeCandidateRecord, NotebookReferenceLink, ProjectReferenceLink


class ObjectBridgeRepository:
    def __init__(self, base_dir: str | Path | None = None):
        self._paths = Paths(base_dir=base_dir) if base_dir is not None else get_paths()
        self._db_path = self._paths.base_dir / "object_bridges.sqlite3"
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS bridge_candidates (
                    id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_reference_links (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS notebook_reference_links (
                    id TEXT PRIMARY KEY,
                    note_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_bridge_candidates_status
                    ON bridge_candidates(status);
                CREATE INDEX IF NOT EXISTS idx_project_reference_links_project_id
                    ON project_reference_links(project_id);
                CREATE INDEX IF NOT EXISTS idx_notebook_reference_links_note_id
                    ON notebook_reference_links(note_id);
                """
            )

    def save_candidate(self, candidate: BridgeCandidateRecord) -> BridgeCandidateRecord:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO bridge_candidates (id, status, payload) VALUES (?, ?, ?)",
                (candidate.id, candidate.status, json.dumps(asdict(candidate), ensure_ascii=False)),
            )
        return candidate

    def get_candidate(self, candidate_id: str) -> BridgeCandidateRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM bridge_candidates WHERE id = ?",
                (candidate_id,),
            ).fetchone()
        if row is None:
            return None
        return BridgeCandidateRecord(**json.loads(str(row["payload"])))

    def list_candidates(self, *, status: str | None = None) -> list[BridgeCandidateRecord]:
        with self._connect() as connection:
            if status is None:
                rows = connection.execute(
                    "SELECT payload FROM bridge_candidates ORDER BY id ASC"
                ).fetchall()
            else:
                rows = connection.execute(
                    "SELECT payload FROM bridge_candidates WHERE status = ? ORDER BY id ASC",
                    (status,),
                ).fetchall()
        return [BridgeCandidateRecord(**json.loads(str(row["payload"]))) for row in rows]

    def update_candidate_status(self, candidate_id: str, status: str) -> BridgeCandidateRecord:
        candidate = self.get_candidate(candidate_id)
        if candidate is None:
            raise KeyError(candidate_id)
        updated = BridgeCandidateRecord(
            id=candidate.id,
            candidate_type=candidate.candidate_type,
            status=status,  # type: ignore[arg-type]
            title=candidate.title,
            summary=candidate.summary,
            requires_confirmation=candidate.requires_confirmation,
            payload=candidate.payload,
            provenance=candidate.provenance,
            created_at=candidate.created_at,
            updated_at=candidate.updated_at,
        )
        return self.save_candidate(updated)

    def save_project_reference(self, link: ProjectReferenceLink) -> ProjectReferenceLink:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO project_reference_links (id, project_id, payload) VALUES (?, ?, ?)",
                (link.id, link.project_id, json.dumps(asdict(link), ensure_ascii=False)),
            )
        return link

    def list_project_references(self, project_id: str) -> list[ProjectReferenceLink]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM project_reference_links WHERE project_id = ? ORDER BY id ASC",
                (project_id,),
            ).fetchall()
        return [ProjectReferenceLink(**json.loads(str(row["payload"]))) for row in rows]

    def save_notebook_reference(self, link: NotebookReferenceLink) -> NotebookReferenceLink:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO notebook_reference_links (id, note_id, payload) VALUES (?, ?, ?)",
                (link.id, link.note_id, json.dumps(asdict(link), ensure_ascii=False)),
            )
        return link

    def list_notebook_references(self, note_id: str) -> list[NotebookReferenceLink]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM notebook_reference_links WHERE note_id = ? ORDER BY id ASC",
                (note_id,),
            ).fetchall()
        return [NotebookReferenceLink(**json.loads(str(row["payload"]))) for row in rows]
