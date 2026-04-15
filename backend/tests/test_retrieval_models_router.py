from __future__ import annotations

import httpx
from fastapi.testclient import TestClient

from app.daemon.app import create_app as create_daemon_app
from app.gateway.app import create_app as create_gateway_app
from nion.config.paths import reset_paths
from nion.retrieval.models.settings import RetrievalModelsSettings
from nion.retrieval.models.settings_repository import RetrievalModelsSettingsRepository


def test_retrieval_models_router_exposes_status(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_gateway_app()) as client:
        response = client.get("/api/retrieval-models/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["active_profile"]["embedding"]["mode"] == "remote_managed"
    assert payload["capability"] == {
        "local_prepare_enabled": False,
        "remote_config_enabled": True,
        "test_enabled": True,
        "rebuild_enabled": True,
        "status_only": False,
    }
    assert payload["active_profile"]["embedding"]["api_key_configured"] is False
    assert "api_key" not in payload["active_profile"]["embedding"]
    assert payload["active_profile"]["reranker"]["api_key_configured"] is False
    assert "api_key" not in payload["active_profile"]["reranker"]


def test_retrieval_models_router_exposes_status_on_daemon_surface(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_daemon_app()) as client:
        response = client.get("/api/retrieval-models/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["active_profile"]["embedding"]["mode"] == "remote_managed"
    assert payload["capability"]["remote_config_enabled"] is True
    assert payload["capability"]["status_only"] is False


def test_retrieval_models_router_updates_active_profile(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    payload = {
        "embedding": {
            "endpoint": "https://embed.example.com/v1/embeddings",
            "api_key": "embed-secret",
            "model_name": "text-embedding-3-small",
            "dimensions": 1536,
        },
        "reranker": {
            "endpoint": "https://rerank.example.com/v1/rerank",
            "api_key": "rerank-secret",
            "model_name": "bge-reranker-base",
        },
    }

    with TestClient(create_gateway_app()) as client:
        response = client.put("/api/retrieval-models/active", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["active_profile"]["embedding"]["model_name"] == "text-embedding-3-small"
    assert body["active_profile"]["reranker"]["model_name"] == "bge-reranker-base"

    saved = RetrievalModelsSettingsRepository(base_dir=tmp_path).load()
    assert saved.active.embedding.endpoint == "https://embed.example.com/v1/embeddings"
    assert saved.active.embedding.api_key == "embed-secret"
    assert saved.active.reranker.endpoint == "https://rerank.example.com/v1/rerank"
    assert saved.active.reranker.api_key == "rerank-secret"


def test_retrieval_models_router_keeps_existing_api_keys_when_new_payload_leaves_them_blank(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    repository = RetrievalModelsSettingsRepository(base_dir=tmp_path)
    existing = repository.load()
    existing.active.embedding.api_key = "persisted-embed-secret"
    existing.active.reranker.api_key = "persisted-rerank-secret"
    repository.save(existing)

    with TestClient(create_gateway_app()) as client:
        response = client.put(
            "/api/retrieval-models/active",
            json={
                "embedding": {
                    "endpoint": "https://embed.example.com/v1/embeddings",
                    "api_key": "",
                    "model_name": "text-embedding-3-small",
                    "dimensions": 1536,
                },
                "reranker": {
                    "endpoint": "https://rerank.example.com/v1/rerank",
                    "api_key": "",
                    "model_name": "bge-reranker-base",
                },
            },
        )

    assert response.status_code == 200
    saved = repository.load()
    assert saved.active.embedding.api_key == "persisted-embed-secret"
    assert saved.active.reranker.api_key == "persisted-rerank-secret"


def test_retrieval_models_router_tests_embedding_provider(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    def fake_post(url: str, *, headers: dict[str, str], json: dict[str, object], timeout: float):
        assert url == "https://embed.example.com/v1/embeddings"
        assert headers["Authorization"] == "Bearer embed-secret"
        assert json["model"] == "text-embedding-3-small"
        assert json["input"] == ["hello retrieval"]
        assert timeout == 30.0
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            request=request,
            json={"data": [{"embedding": [0.1, 0.2, 0.3]}]},
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    with TestClient(create_gateway_app()) as client:
        response = client.post(
            "/api/retrieval-models/test/embedding",
            json={
                "endpoint": "https://embed.example.com/v1/embeddings",
                "api_key": "embed-secret",
                "model_name": "text-embedding-3-small",
                "probe_text": "hello retrieval",
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "vector_size": 3,
        "message": "Embedding 测试通过。",
    }


def test_retrieval_models_router_tests_reranker_provider(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    def fake_post(url: str, *, headers: dict[str, str], json: dict[str, object], timeout: float):
        assert url == "https://rerank.example.com/v1/rerank"
        assert headers["Authorization"] == "Bearer rerank-secret"
        assert json["model"] == "bge-reranker-base"
        assert json["query"] == "budget policy"
        assert json["documents"] == ["finance", "policy"]
        assert timeout == 30.0
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            request=request,
            json={"results": [{"index": 1, "relevance_score": 0.92}]},
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    with TestClient(create_gateway_app()) as client:
        response = client.post(
            "/api/retrieval-models/test/reranker",
            json={
                "endpoint": "https://rerank.example.com/v1/rerank",
                "api_key": "rerank-secret",
                "model_name": "bge-reranker-base",
                "query": "budget policy",
                "documents": ["finance", "policy"],
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "top_document_index": 1,
        "top_score": 0.92,
        "message": "Reranker 测试通过。",
    }


def test_retrieval_models_router_rebuilds_consumer_indexes(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    monkeypatch.setattr(
        "nion.retrieval.models.service.MemoryEmbeddingIndexService.rebuild_full_index",
        lambda self: {"record_count": 7, "manifest": {"provider": "stub"}},
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

    with TestClient(create_gateway_app()) as client:
        response = client.post(
            "/api/retrieval-models/rebuild-consumer-indexes",
            json={"consumer_ids": ["memory", "knowledge_base"]},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["accepted"] == ["memory", "knowledge_base"]
    assert payload["message"] == "已处理 2 个检索消费者的索引重建请求。"
    assert payload["results"][0]["consumer_id"] == "memory"
    assert payload["results"][0]["status"] == "rebuilt"
    assert payload["results"][0]["record_count"] == 7
    assert payload["results"][1] == {
        "consumer_id": "knowledge_base",
        "status": "not_supported",
        "detail": "当前知识库仍使用词法检索和知识图谱，暂未接入向量索引重建。",
    }
