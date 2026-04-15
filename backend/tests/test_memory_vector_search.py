from __future__ import annotations

import httpx
from pathlib import Path

from nion.memory.embedding.index_service import MemoryEmbeddingIndexService
from nion.memory.search_fusion.models import SearchRouteHit
from nion.memory.search_fusion.vector_search import search_vector_memory
from nion.memory_os.repository import MemoryOSRepository
from nion.retrieval.models.settings import RetrievalModelsSettings
from nion.retrieval.models.settings_repository import RetrievalModelsSettingsRepository


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


def test_vector_search_reads_embedding_profile_from_retrieval_models_settings(
    monkeypatch,
    tmp_path,
) -> None:
    RetrievalModelsSettingsRepository(base_dir=tmp_path).save(
        RetrievalModelsSettings.model_validate(
            {
                "active": {
                    "embedding": {
                        "endpoint": "https://embed.example.com/v1/embeddings",
                        "api_key": "embed-secret",
                        "model_name": "text-embedding-3-small",
                        "dimensions": 1536,
                    }
                }
            }
        )
    )

    captured: dict[str, object] = {}

    class InspectingProvider:
        provider_id = "remote-default"

        def metadata(self):
            from nion.memory.embedding.remote_managed import (
                RemoteManagedEmbeddingProviderMetadata,
            )

            return RemoteManagedEmbeddingProviderMetadata(
                provider_id="remote-default",
                model_name=str(captured["model_name"]),
                endpoint=str(captured["endpoint"]),
                dimensions=int(captured["dimensions"]),
                revision="2026-04-15",
            )

        def embed(self, texts: list[str]) -> list[list[float]]:
            return [[0.9, 0.1] for _ in texts]

    def fake_build_provider(*, base_dir, settings):
        captured["endpoint"] = settings.remote_endpoint
        captured["api_key"] = settings.remote_api_key
        captured["model_name"] = settings.remote_model_name
        captured["dimensions"] = settings.remote_dimensions
        return InspectingProvider()

    monkeypatch.setattr(
        "nion.memory.search_fusion.vector_search.build_embedding_provider",
        fake_build_provider,
    )

    class EmptyStore:
        def __init__(self, path) -> None:
            self.path = path

        def search(self, query):
            return []

    monkeypatch.setattr(
        "nion.memory.search_fusion.vector_search.DuckDBVectorStore",
        EmptyStore,
    )

    hits = search_vector_memory(
        base_dir=tmp_path,
        query="预算协同岗位",
        filters={"domain": "user_model"},
        limit=1,
    )

    assert hits == []
    assert captured == {
        "endpoint": "https://embed.example.com/v1/embeddings",
        "api_key": "embed-secret",
        "model_name": "text-embedding-3-small",
        "dimensions": 1536,
    }


def test_memory_embedding_index_service_reads_embedding_profile_from_retrieval_models_settings(
    monkeypatch,
    tmp_path,
) -> None:
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

    RetrievalModelsSettingsRepository(base_dir=tmp_path).save(
        RetrievalModelsSettings.model_validate(
            {
                "active": {
                    "embedding": {
                        "endpoint": "https://embed.example.com/v1/embeddings",
                        "api_key": "embed-secret",
                        "model_name": "text-embedding-3-small",
                        "dimensions": 1536,
                    }
                }
            }
        )
    )

    captured: dict[str, object] = {}

    class InspectingProvider(_StubEmbeddingProvider):
        def metadata(self):
            from nion.memory.embedding.remote_managed import (
                RemoteManagedEmbeddingProviderMetadata,
            )

            return RemoteManagedEmbeddingProviderMetadata(
                provider_id="remote-default",
                model_name=str(captured["model_name"]),
                endpoint=str(captured["endpoint"]),
                dimensions=int(captured["dimensions"]),
                revision="2026-04-15",
            )

    def fake_build_provider(*, base_dir, settings):
        captured["endpoint"] = settings.remote_endpoint
        captured["api_key"] = settings.remote_api_key
        captured["model_name"] = settings.remote_model_name
        captured["dimensions"] = settings.remote_dimensions
        return InspectingProvider()

    monkeypatch.setattr(
        "nion.memory.embedding.index_service.build_embedding_provider",
        fake_build_provider,
    )

    MemoryEmbeddingIndexService(base_dir=tmp_path, repository=repo).rebuild_full_index()

    assert captured == {
        "endpoint": "https://embed.example.com/v1/embeddings",
        "api_key": "embed-secret",
        "model_name": "text-embedding-3-small",
        "dimensions": 1536,
    }


def test_memory_embedding_index_service_can_rebuild_with_complete_local_embedding_assets(
    monkeypatch,
    tmp_path,
) -> None:
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
    model_root = tmp_path / "models" / "retrieval" / "modelscope" / "jinaai__jina-embeddings-v2-base-zh"
    model_root.mkdir(parents=True)
    onnx_path = model_root / "onnx__model_quantized.onnx"
    tokenizer_path = model_root / "tokenizer.json"
    config_path = model_root / "config.json"
    onnx_path.write_text("fake-onnx", encoding="utf-8")
    tokenizer_path.write_text("fake-tokenizer", encoding="utf-8")
    config_path.write_text("{}", encoding="utf-8")
    registry_path = tmp_path / "models" / "retrieval" / "registry.json"
    registry_path.write_text(
        """
        {
          "version": 1,
          "updated_at": "2026-04-16T00:00:00Z",
          "models": {
            "zh-embedding-lite": {
              "installed": true,
              "file_path": "modelscope/jinaai__jina-embeddings-v2-base-zh/onnx__model_quantized.onnx",
              "assets": {
                "onnx": "modelscope/jinaai__jina-embeddings-v2-base-zh/onnx__model_quantized.onnx",
                "tokenizer": "modelscope/jinaai__jina-embeddings-v2-base-zh/tokenizer.json",
                "config": "modelscope/jinaai__jina-embeddings-v2-base-zh/config.json"
              },
              "sha256": "stub",
              "size_bytes": 1,
              "source": "manual_import",
              "updated_at": "2026-04-16T00:00:00Z",
              "pack_id": "zh"
            }
          }
        }
        """.strip(),
        encoding="utf-8",
    )
    RetrievalModelsSettingsRepository(base_dir=tmp_path).save(
        RetrievalModelsSettings.model_validate(
            {
                "active": {
                    "embedding": {
                        "provider": "local_onnx",
                        "model_id": "zh-embedding-lite",
                    }
                }
            }
        )
    )

    monkeypatch.setattr(
        "nion.memory.embedding.local_provider._load_local_embedding_runtime",
        lambda bundle: _StubEmbeddingProvider(),
    )

    result = MemoryEmbeddingIndexService(base_dir=tmp_path, repository=repo).rebuild_full_index()

    assert result["record_count"] == 1
    assert result["manifest"]["provider_kind"] == "local_onnx"


def test_local_embedding_provider_prefers_real_runtime_loader_when_assets_are_complete(
    monkeypatch,
    tmp_path,
) -> None:
    model_root = tmp_path / "models" / "retrieval" / "modelscope" / "jinaai__jina-embeddings-v2-base-zh"
    model_root.mkdir(parents=True)
    (model_root / "onnx__model_quantized.onnx").write_text("fake-onnx", encoding="utf-8")
    (model_root / "tokenizer.json").write_text("{}", encoding="utf-8")
    (model_root / "config.json").write_text("{}", encoding="utf-8")

    RetrievalModelsSettingsRepository(base_dir=tmp_path).save(
        RetrievalModelsSettings.model_validate(
            {
                "active": {
                    "embedding": {
                        "provider": "local_onnx",
                        "model_id": "zh-embedding-lite",
                    }
                }
            }
        )
    )

    sentinel = object()

    monkeypatch.setattr(
        "nion.memory.embedding.local_provider._try_create_onnxruntime_embedding_runtime",
        lambda bundle: sentinel,
    )

    from nion.memory.embedding.index_service import _resolve_local_embedding_bundle
    from nion.memory.embedding.local_provider import _load_local_embedding_runtime

    bundle_payload = _resolve_local_embedding_bundle(tmp_path, "zh-embedding-lite")
    bundle = __import__(
        "nion.memory.embedding.local_provider",
        fromlist=["LocalEmbeddingBundle"],
    ).LocalEmbeddingBundle(
        provider_id=bundle_payload["model_id"],
        model_id=bundle_payload["model_id"],
        model_name=bundle_payload["model_name"],
        dimensions=bundle_payload["dimensions"],
        onnx_path=Path(bundle_payload["onnx_path"]),
        tokenizer_path=Path(bundle_payload["tokenizer_path"]),
        config_path=Path(bundle_payload["config_path"]),
    )

    runtime = _load_local_embedding_runtime(bundle)

    assert runtime is sentinel


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
