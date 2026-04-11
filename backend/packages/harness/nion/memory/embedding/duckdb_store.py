from __future__ import annotations

import json
import math
from pathlib import Path

import duckdb

from nion.memory.embedding.models import VectorIndexSnapshot
from nion.memory.embedding.vector_store import (
    VectorStore,
    VectorStoreIndexMetadata,
    VectorStoreQuery,
    VectorStoreRecord,
    VectorStoreSearchHit,
)


def _cosine(left: list[float], right: list[float]) -> float:
    numerator = sum(l * r for l, r in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return numerator / (left_norm * right_norm)


class DuckDBVectorStore(VectorStore):
    def __init__(self, db_path: Path) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        with duckdb.connect(str(self._db_path)) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS vectors (
                    record_id TEXT PRIMARY KEY,
                    vector_json TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS index_metadata (
                    singleton INTEGER PRIMARY KEY,
                    snapshot_json TEXT NOT NULL,
                    record_count INTEGER NOT NULL,
                    metadata_json TEXT NOT NULL
                )
                """
            )

    def get_index_metadata(self) -> VectorStoreIndexMetadata | None:
        with duckdb.connect(str(self._db_path)) as conn:
            row = conn.execute(
                "SELECT snapshot_json, record_count, metadata_json FROM index_metadata WHERE singleton = 1"
            ).fetchone()
        if row is None:
            return None
        snapshot = VectorIndexSnapshot.model_validate(json.loads(row[0]))
        metadata = json.loads(row[2])
        return VectorStoreIndexMetadata(
            provider=snapshot,
            record_count=int(row[1]),
            metadata=metadata if isinstance(metadata, dict) else {},
        )

    def upsert(self, records: list[VectorStoreRecord]) -> None:
        with duckdb.connect(str(self._db_path)) as conn:
            for record in records:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO vectors(record_id, vector_json, payload_json)
                    VALUES (?, ?, ?)
                    """,
                    (
                        record.record_id,
                        json.dumps(record.vector),
                        json.dumps(record.payload, ensure_ascii=False),
                    ),
                )

    def delete(self, record_ids: list[str]) -> None:
        with duckdb.connect(str(self._db_path)) as conn:
            for record_id in record_ids:
                conn.execute("DELETE FROM vectors WHERE record_id = ?", (record_id,))

    def search(self, query: VectorStoreQuery) -> list[VectorStoreSearchHit]:
        with duckdb.connect(str(self._db_path)) as conn:
            rows = conn.execute(
                "SELECT record_id, vector_json, payload_json FROM vectors"
            ).fetchall()
        hits: list[VectorStoreSearchHit] = []
        for record_id, vector_json, payload_json in rows:
            vector = json.loads(vector_json)
            payload = json.loads(payload_json)
            if any(payload.get(key) != value for key, value in query.filters.items()):
                continue
            hits.append(
                VectorStoreSearchHit(
                    record_id=record_id,
                    score=_cosine(query.vector, vector),
                    payload=payload,
                )
            )
        hits.sort(key=lambda item: item.score, reverse=True)
        return hits[: query.limit]

    def rebuild(
        self,
        *,
        target: VectorStoreIndexMetadata,
        records: list[VectorStoreRecord],
    ) -> None:
        with duckdb.connect(str(self._db_path)) as conn:
            conn.execute("DELETE FROM vectors")
            conn.execute("DELETE FROM index_metadata")
        self.upsert(records)
        with duckdb.connect(str(self._db_path)) as conn:
            conn.execute(
                """
                INSERT INTO index_metadata(singleton, snapshot_json, record_count, metadata_json)
                VALUES (1, ?, ?, ?)
                """,
                (
                    json.dumps(target.provider.model_dump(mode="json")),
                    target.record_count,
                    json.dumps(target.metadata, ensure_ascii=False),
                ),
            )
