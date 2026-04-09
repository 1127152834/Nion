from __future__ import annotations

from fastapi import APIRouter

from nion.memory_os.compat import (
    build_canonical_facts_surface,
    build_canonical_history_surface,
    build_canonical_user_surface,
)

router = APIRouter(prefix="/api/memory-canonical", tags=["memory"])


@router.get("/user")
async def get_memory_user_surface():
    return build_canonical_user_surface()


@router.get("/history")
async def get_memory_history_surface():
    return build_canonical_history_surface()


@router.get("/facts")
async def get_memory_facts_surface():
    return build_canonical_facts_surface()
