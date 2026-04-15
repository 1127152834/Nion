from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from uuid import uuid4

from nion.knowledge.models import KnowledgeActivityEvent
from nion.knowledge.paths import get_knowledge_paths
from nion.memory_os.clock import utcnow_z


class KnowledgeActivityStore:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._paths.ensure_knowledge_dirs()
        self._db_path = self._paths.knowledge_meta_dir / "activity.sqlite3"
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS knowledge_activity_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    source_id TEXT,
                    page_id TEXT,
                    job_id TEXT,
                    detail TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

    def _row_to_event(self, row: sqlite3.Row) -> KnowledgeActivityEvent:
        return KnowledgeActivityEvent(
            event_id=str(row["event_id"]),
            event_type=str(row["event_type"]),
            source_id=row["source_id"],
            page_id=row["page_id"],
            job_id=row["job_id"],
            detail=str(row["detail"]),
            created_at=str(row["created_at"]),
        )

    def record_event(
        self,
        *,
        event_type: str,
        detail: str,
        source_id: str | None = None,
        page_id: str | None = None,
        job_id: str | None = None,
        created_at: str | None = None,
    ) -> KnowledgeActivityEvent:
        event = KnowledgeActivityEvent(
            event_id=f"knowledge_event_{uuid4().hex}",
            event_type=event_type,
            source_id=source_id,
            page_id=page_id,
            job_id=job_id,
            detail=detail,
            created_at=created_at or utcnow_z(),
        )
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO knowledge_activity_events(
                    event_id, event_type, source_id, page_id, job_id, detail, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.event_id,
                    event.event_type,
                    event.source_id,
                    event.page_id,
                    event.job_id,
                    event.detail,
                    event.created_at,
                ),
            )
        return event

    def record_candidate_enqueued(self, *, source_id: str, job_id: str | None = None) -> KnowledgeActivityEvent:
        event = self.record_event(
            event_type="candidate_enqueued",
            source_id=source_id,
            job_id=job_id,
            detail=json.dumps(
                {"source_id": source_id, "job_id": job_id},
                ensure_ascii=False,
            ),
        )
        from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore

        KnowledgeSourceCandidateStore(base_dir=self._paths.base_dir).record_enqueue(
            source_id,
            enqueued_at=event.created_at,
            job_id=job_id,
        )
        return event

    def list_events(self) -> list[KnowledgeActivityEvent]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM knowledge_activity_events
                ORDER BY created_at DESC, rowid DESC
                """
            ).fetchall()
        return [self._row_to_event(row) for row in rows]
