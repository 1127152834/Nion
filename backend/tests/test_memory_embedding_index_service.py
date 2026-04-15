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

    service = MemoryEmbeddingIndexService(base_dir=tmp_path, repository=repo)

    result = service.rebuild_full_index()

    assert result["record_count"] == 1
    assert result["manifest"]["provider"]["model_key"] == "stub-model"
    assert result["manifest"]["record_count"] == 1


class _StubEmbeddingProvider:
    provider_id = "remote-default"

    def metadata(self):
        from nion.memory.embedding.remote_managed import (
            RemoteManagedEmbeddingProviderMetadata,
        )

        return RemoteManagedEmbeddingProviderMetadata(
            provider_id="remote-default",
            model_name="stub-model",
            endpoint="https://api.example.com/v1/embeddings",
            dimensions=2,
            revision="2026-04-11",
        )

    def embed(self, texts: list[str]) -> list[list[float]]:
        assert texts == ["财务 BP"]
        return [[1.0, 0.0]]
