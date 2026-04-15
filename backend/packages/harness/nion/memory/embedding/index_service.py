from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from nion.memory.embedding.duckdb_store import DuckDBVectorStore
from nion.memory.embedding.provider_factory import build_embedding_provider
from nion.memory.embedding.settings import EmbeddingSystemSettings
from nion.memory.embedding.settings_repository import EmbeddingSettingsRepository
from nion.memory.embedding.vector_store import VectorStoreIndexMetadata, VectorStoreRecord
from nion.memory_os.clock import utcnow_z
from nion.memory_os.repository import MemoryOSRepository

STRUCTURED_VECTOR_DOMAINS = {"user_model", "relationship", "agent_self", "soul", "procedure"}


class MemoryEmbeddingIndexService:
    def __init__(
        self,
        *,
        base_dir: Path,
        repository: MemoryOSRepository,
        settings: EmbeddingSystemSettings | None = None,
    ) -> None:
        self._base_dir = Path(base_dir)
        self._repository = repository
        self._settings_repository = EmbeddingSettingsRepository(self._base_dir)
        self._settings = settings or self._settings_repository.load()
        self._provider = build_embedding_provider(
            base_dir=self._base_dir,
            settings=self._settings,
        )
        self._store = DuckDBVectorStore(
            self._base_dir / "memory-os" / "indexes" / "vector" / "index.duckdb"
        )

    def rebuild_full_index(self) -> dict[str, Any]:
        rows = self._collect_structured_rows()
        summaries = [str(row["summary"]).strip() for row in rows]
        vectors = self._provider.embed(summaries) if summaries else []
        records = [
            VectorStoreRecord(
                record_id=str(row["memory_id"]),
                vector=vector,
                payload={
                    "memory_id": str(row["memory_id"]),
                    "domain": str(row["domain"]),
                    "subtype": str(row["subtype"]),
                    "summary": str(row["summary"]),
                    "subject_id": str(row["subject_id"]),
                },
            )
            for row, vector in zip(rows, vectors, strict=True)
        ]

        rebuilt_at = utcnow_z()
        target = VectorStoreIndexMetadata(
            provider=self._provider.metadata().to_index_snapshot(),
            record_count=len(records),
            metadata={
                "rebuilt_at": rebuilt_at,
                "mode": self._settings.mode,
            },
        )
        self._store.rebuild(target=target, records=records)
        manifest = {
            "provider": target.provider.fingerprint.model_dump(mode="json"),
            "provider_kind": target.provider.provider_kind,
            "provider_id": target.provider.provider_id,
            "record_count": len(records),
            "rebuilt_at": rebuilt_at,
        }
        self._write_manifest(manifest)
        self._settings_repository.update(
            {
                "last_rebuild_at": rebuilt_at,
                "health_state": "ready",
                "health_detail": "向量索引已重建完成。",
                "active_fingerprint": target.provider.fingerprint.fingerprint,
            }
        )
        return {
            "record_count": len(records),
            "manifest": manifest,
        }

    def _collect_structured_rows(self) -> list[dict[str, object]]:
        rows: list[dict[str, object]] = []
        for domain in STRUCTURED_VECTOR_DOMAINS:
            rows.extend(
                row
                for row in self._repository.list_memory_records(domain=domain, status="active")
                if str(row.get("summary", "")).strip()
            )
        rows.sort(key=lambda row: (str(row["domain"]), str(row["memory_id"])))
        return rows

    def _write_manifest(self, manifest: dict[str, Any]) -> None:
        manifest_path = self._base_dir / "memory-os" / "indexes" / "vector" / "manifest.json"
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
