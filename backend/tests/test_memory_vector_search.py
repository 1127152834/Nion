from __future__ import annotations

import httpx

from nion.memory.embedding.index_service import MemoryEmbeddingIndexService
from nion.memory.search_fusion.models import SearchRouteHit
from nion.memory.search_fusion.vector_search import search_vector_memory
from nion.memory_os.repository import MemoryOSRepository


def test_vector_search_returns_hits_from_rebuilt_index(monkeypatch, tmp_path) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem:user:finance",
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
        "nion.memory.search_fusion.vector_search.build_embedding_provider",
        lambda *, base_dir, settings: _StubEmbeddingProvider(),
    )

    MemoryEmbeddingIndexService(base_dir=tmp_path, repository=repo).rebuild_full_index()

    hits = search_vector_memory(
        base_dir=tmp_path,
        query="预算协同岗位",
        filters={"domain": "user_model"},
        limit=1,
    )

    assert hits == [
        SearchRouteHit(candidate_id="mem:user:finance", route="vector", score=0.9938837346736189)
    ]


def test_vector_search_returns_empty_hits_when_remote_embedding_request_fails(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setattr(
        "nion.memory.search_fusion.vector_search.build_embedding_provider",
        lambda *, base_dir, settings: _FailingEmbeddingProvider(),
    )

    hits = search_vector_memory(
        base_dir=tmp_path,
        query="预算协同岗位",
        filters={"domain": "user_model"},
        limit=1,
    )

    assert hits == []


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
        if texts == ["财务 BP"]:
            return [[1.0, 0.0]]
        return [[0.9, 0.1]]


class _FailingEmbeddingProvider:
    provider_id = "remote-default"

    def embed(self, texts: list[str]) -> list[list[float]]:
        request = httpx.Request("POST", "http://127.0.0.1:8010/v1/embeddings")
        response = httpx.Response(502, request=request)
        raise httpx.HTTPStatusError(
            "Server error '502 Bad Gateway' for url 'http://127.0.0.1:8010/v1/embeddings'",
            request=request,
            response=response,
        )
