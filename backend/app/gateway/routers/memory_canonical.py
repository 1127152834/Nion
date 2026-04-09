from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from nion.memory_os.compat import (
    build_canonical_facts_surface,
    build_canonical_history_surface,
    build_canonical_user_surface,
)

router = APIRouter(prefix="/api/memory-canonical", tags=["memory-canonical"])


class CanonicalContextSection(BaseModel):
    summary: str = Field(default="", description="Canonical summary content")
    updatedAt: str = Field(default="", description="Canonical update timestamp")


class CanonicalUserSurfaceResponse(BaseModel):
    workContext: CanonicalContextSection = Field(default_factory=CanonicalContextSection)
    personalContext: CanonicalContextSection = Field(default_factory=CanonicalContextSection)
    topOfMind: CanonicalContextSection = Field(default_factory=CanonicalContextSection)


class CanonicalHistorySurfaceResponse(BaseModel):
    recentMonths: CanonicalContextSection = Field(default_factory=CanonicalContextSection)
    earlierContext: CanonicalContextSection = Field(default_factory=CanonicalContextSection)
    longTermBackground: CanonicalContextSection = Field(default_factory=CanonicalContextSection)


class CanonicalFactItem(BaseModel):
    id: str = Field(..., description="Canonical fact identifier")
    content: str = Field(..., description="Canonical fact content")
    category: str = Field(default="context", description="Canonical fact category")
    confidence: float = Field(default=0.0, description="Canonical confidence score")
    createdAt: str = Field(default="", description="Canonical creation timestamp")
    source: str = Field(default="unknown", description="Canonical source reference")


class CanonicalFactsSurfaceResponse(BaseModel):
    lastUpdated: str = Field(default="", description="Last canonical update timestamp")
    facts: list[CanonicalFactItem] = Field(default_factory=list)


@router.get(
    "/user",
    response_model=CanonicalUserSurfaceResponse,
    summary="Get Canonical User Memory Surface",
    description="Auxiliary canonical source for user-profile context sections. This is not the main user-facing /api/memory payload.",
)
async def get_memory_user_surface() -> CanonicalUserSurfaceResponse:
    return CanonicalUserSurfaceResponse(**build_canonical_user_surface())


@router.get(
    "/history",
    response_model=CanonicalHistorySurfaceResponse,
    summary="Get Canonical History Memory Surface",
    description="Auxiliary canonical source for history context sections. This is not the main user-facing /api/memory payload.",
)
async def get_memory_history_surface() -> CanonicalHistorySurfaceResponse:
    return CanonicalHistorySurfaceResponse(**build_canonical_history_surface())


@router.get(
    "/facts",
    response_model=CanonicalFactsSurfaceResponse,
    summary="Get Canonical Facts Memory Surface",
    description="Auxiliary canonical source for fact-memory records. This is not the main user-facing /api/memory payload.",
)
async def get_memory_facts_surface() -> CanonicalFactsSurfaceResponse:
    return CanonicalFactsSurfaceResponse(**build_canonical_facts_surface())
