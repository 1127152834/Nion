from __future__ import annotations

from fastapi import APIRouter

from nion.config.paths import get_paths
from nion.retrieval.models.status_service import build_retrieval_models_status

router = APIRouter(prefix="/api/retrieval-models", tags=["memory"])


@router.get("/status")
async def get_retrieval_models_status() -> dict[str, object]:
    return build_retrieval_models_status(base_dir=get_paths().base_dir)
