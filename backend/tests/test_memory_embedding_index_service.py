from __future__ import annotations

from nion.memory.embedding.index_service import MemoryEmbeddingIndexService
from nion.memory_os.repository import MemoryOSRepository


def test_index_service_rebuilds_from_structured_memory_records(
    monkeypatch,
    tmp_path,
) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_role",
            "domain": "user_model",
            "subtype": "user_role",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务 BP",
            "confidence": 0.9,
            "created_at": "2026-04-11T00:00:00Z",
            "updated_at": "2026-04-11T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    monkeypatch.setattr(
        "nion.memory.embedding.index_service.build_embedding_provider",
        lambda *, base_dir, settings: _StubEmbeddingProvider(),
    )
    monkeypatch.setattr(
        "nion.memory.embedding.index_service.MemoryEmbeddingDownloadManager",
        lambda: _StubDownloadManager(),
    )

    service = MemoryEmbeddingIndexService(base_dir=tmp_path, repository=repo)

    result = service.rebuild_full_index()

    assert result["record_count"] == 1
    assert result["manifest"]["provider"]["model_key"] == "stub-model"
    assert result["manifest"]["record_count"] == 1


class _StubEmbeddingProvider:
    provider_id = "local-default"

    def metadata(self):
        from nion.memory.embedding.local_managed import (
            LocalManagedEmbeddingProviderMetadata,
        )

        return LocalManagedEmbeddingProviderMetadata(
            provider_id="local-default",
            model_name="stub-model",
            dimensions=2,
            revision="2026-04-11",
            metadata={"bundle": "test"},
        )

    def embed(self, texts: list[str]) -> list[list[float]]:
        assert texts == ["财务 BP"]
        return [[1.0, 0.0]]


class _StubDownloadManager:
    def ensure_local_model(self, *, base_dir, model_id: str, model_key: str):
        model_dir = base_dir / "memory-os" / "indexes" / "vector" / "models" / model_key
        model_dir.mkdir(parents=True, exist_ok=True)
        return model_dir
