from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from nion.memory.embedding.index_service import MemoryEmbeddingIndexService
from nion.memory_os.repository import MemoryOSRepository
from nion.retrieval.models.consumer_registry import CONSUMER_REGISTRY
from nion.retrieval.models.settings import (
    RetrievalEmbeddingProfile,
    RetrievalModelsSettings,
    RetrievalRerankerProfile,
)
from nion.retrieval.models.settings_repository import RetrievalModelsSettingsRepository
from nion.retrieval.models.status_service import build_retrieval_models_status

DEFAULT_PROBE_TEXT = "hello retrieval"
DEFAULT_RERANK_QUERY = "budget policy"
DEFAULT_RERANK_DOCUMENTS = ["finance", "policy"]


def update_active_retrieval_profile(
    *,
    base_dir: str | Path,
    embedding: RetrievalEmbeddingProfile,
    reranker: RetrievalRerankerProfile,
) -> dict[str, Any]:
    repository = RetrievalModelsSettingsRepository(base_dir=base_dir)
    current = repository.load()
    next_settings = current.model_copy(deep=True)
    next_settings.active.embedding = embedding.model_copy(
        update={
            "api_key": embedding.api_key
            if embedding.api_key.strip()
            else current.active.embedding.api_key,
        }
    )
    next_settings.active.reranker = reranker.model_copy(
        update={
            "api_key": reranker.api_key
            if reranker.api_key.strip()
            else current.active.reranker.api_key,
        }
    )
    saved = repository.save(
        next_settings
    )
    return {
        **build_retrieval_models_status(base_dir=base_dir, settings=saved),
        "capability": retrieval_capability_snapshot(status_only=False),
    }


def retrieval_capability_snapshot(*, status_only: bool) -> dict[str, bool]:
    return {
        "local_prepare_enabled": False,
        "remote_config_enabled": True,
        "test_enabled": not status_only,
        "rebuild_enabled": not status_only,
        "status_only": status_only,
    }


def test_embedding_profile(
    *,
    embedding: RetrievalEmbeddingProfile,
    probe_text: str = DEFAULT_PROBE_TEXT,
) -> dict[str, Any]:
    payload = _post_json(
        endpoint=embedding.endpoint,
        api_key=embedding.api_key,
        body={
            "model": embedding.model_name,
            "input": [probe_text],
        },
    )
    data = payload.get("data")
    if not isinstance(data, list) or not data:
        raise ValueError("Embedding provider returned no vectors")
    first = data[0]
    if not isinstance(first, dict) or not isinstance(first.get("embedding"), list):
        raise ValueError("Embedding provider returned an invalid vector payload")
    vector = [float(value) for value in first["embedding"]]
    if not vector:
        raise ValueError("Embedding provider returned an empty vector")
    return {
        "ok": True,
        "vector_size": len(vector),
        "message": "Embedding 测试通过。",
    }


def test_reranker_profile(
    *,
    reranker: RetrievalRerankerProfile,
    query: str = DEFAULT_RERANK_QUERY,
    documents: list[str] | None = None,
) -> dict[str, Any]:
    source_documents = documents if documents else DEFAULT_RERANK_DOCUMENTS
    payload = _post_json(
        endpoint=reranker.endpoint,
        api_key=reranker.api_key,
        body={
            "model": reranker.model_name,
            "query": query,
            "documents": source_documents,
        },
    )
    top = _read_top_rerank_result(payload)
    return {
        "ok": True,
        "top_document_index": top["index"],
        "top_score": top["score"],
        "message": "Reranker 测试通过。",
    }


def rebuild_consumer_indexes(*, base_dir: str | Path, consumer_ids: list[str]) -> dict[str, Any]:
    known = {str(item["consumer_id"]) for item in CONSUMER_REGISTRY}
    accepted = [consumer_id for consumer_id in consumer_ids if consumer_id in known]
    if not accepted:
        raise ValueError("No known retrieval consumers were selected")

    results: list[dict[str, Any]] = []
    resolved_base_dir = Path(base_dir)
    if "memory" in accepted:
        settings = RetrievalModelsSettingsRepository(base_dir=resolved_base_dir).load()
        _ensure_retrieval_profile_ready(
            endpoint=settings.active.embedding.endpoint,
            api_key=settings.active.embedding.api_key,
            lane="memory",
        )
        repository = MemoryOSRepository(resolved_base_dir / "memory-os" / "index.sqlite3")
        job = MemoryEmbeddingIndexService(
            base_dir=resolved_base_dir,
            repository=repository,
        ).rebuild_full_index()
        results.append(
            {
                "consumer_id": "memory",
                "status": "rebuilt",
                "record_count": job["record_count"],
            }
        )

    for consumer_id in accepted:
        if consumer_id == "memory":
            continue
        results.append(
            {
                "consumer_id": consumer_id,
                "status": "not_supported",
                "detail": "当前知识库仍使用词法检索和知识图谱，暂未接入向量索引重建。",
            }
        )

    return {
        "accepted": accepted,
        "results": results,
        "message": f"已处理 {len(accepted)} 个检索消费者的索引重建请求。",
    }


def _ensure_retrieval_profile_ready(
    *,
    endpoint: str,
    api_key: str,
    lane: str,
) -> None:
    if not endpoint.strip():
        raise ValueError(f"{lane} 检索索引重建前，必须先填写 embedding 接口地址。")
    if not api_key.strip():
        raise ValueError(f"{lane} 检索索引重建前，必须先保存 embedding API Key。")


def _post_json(*, endpoint: str, api_key: str, body: dict[str, object]) -> dict[str, Any]:
    if not endpoint.strip():
        raise ValueError("Endpoint is required")
    if not api_key.strip():
        raise ValueError("API Key is required")
    response = httpx.post(
        endpoint,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=30.0,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Provider returned an invalid JSON payload")
    return payload


def _read_top_rerank_result(payload: dict[str, Any]) -> dict[str, float | int]:
    raw_results = payload.get("results", payload.get("data"))
    if not isinstance(raw_results, list) or not raw_results:
        raise ValueError("Reranker provider returned no ranked results")
    first = raw_results[0]
    if not isinstance(first, dict):
        raise ValueError("Reranker provider returned an invalid result item")
    raw_index = first.get("index", first.get("document_index", 0))
    raw_score = first.get("relevance_score", first.get("score", 0.0))
    return {
        "index": int(raw_index),
        "score": float(raw_score),
    }
