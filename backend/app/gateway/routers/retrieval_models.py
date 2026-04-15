from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from nion.config.paths import get_paths
from nion.retrieval.models.service import (
    retrieval_capability_snapshot,
    rebuild_consumer_indexes,
    test_embedding_profile,
    test_reranker_profile,
    update_active_retrieval_profile,
)
from nion.retrieval.models.settings import RetrievalEmbeddingProfile, RetrievalRerankerProfile
from nion.retrieval.models.status_service import build_retrieval_models_status

router = APIRouter(prefix="/api/retrieval-models", tags=["memory"])


class ActiveRetrievalProfileRequest(BaseModel):
    embedding: RetrievalEmbeddingProfile
    reranker: RetrievalRerankerProfile


class TestEmbeddingRequest(RetrievalEmbeddingProfile):
    probe_text: str = "hello retrieval"


class TestRerankerRequest(RetrievalRerankerProfile):
    query: str = "budget policy"
    documents: list[str] = Field(default_factory=lambda: ["finance", "policy"])


class RebuildConsumerIndexesRequest(BaseModel):
    consumer_ids: list[str]


@router.get("/status")
async def get_retrieval_models_status() -> dict[str, object]:
    payload = build_retrieval_models_status(base_dir=get_paths().base_dir)
    payload["capability"] = retrieval_capability_snapshot(status_only=False)
    return payload


@router.put("/active")
async def put_active_retrieval_profile(
    request: ActiveRetrievalProfileRequest,
) -> dict[str, Any]:
    return update_active_retrieval_profile(
        base_dir=get_paths().base_dir,
        embedding=request.embedding,
        reranker=request.reranker,
    )


@router.post("/test/embedding")
async def post_test_embedding(request: TestEmbeddingRequest) -> dict[str, Any]:
    try:
        return test_embedding_profile(
            embedding=RetrievalEmbeddingProfile.model_validate(request.model_dump(exclude={"probe_text"})),
            probe_text=request.probe_text,
        )
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/test/reranker")
async def post_test_reranker(request: TestRerankerRequest) -> dict[str, Any]:
    try:
        return test_reranker_profile(
            reranker=RetrievalRerankerProfile.model_validate(request.model_dump(exclude={"query", "documents"})),
            query=request.query,
            documents=request.documents,
        )
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/rebuild-consumer-indexes")
async def post_rebuild_consumer_indexes(
    request: RebuildConsumerIndexesRequest,
) -> dict[str, Any]:
    try:
        return rebuild_consumer_indexes(
            base_dir=get_paths().base_dir,
            consumer_ids=request.consumer_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
