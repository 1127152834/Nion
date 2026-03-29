from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from nion.openviking import EmbeddedNotebookIngestService

router = APIRouter(prefix="/api/openviking", tags=["openviking"])


class OpenVikingNotebookSearchItem(BaseModel):
    resource_uri: str
    note_id: str
    title: str
    source_relative_path: str
    updated_at: str
    snippet: str
    heading_path: list[str] = Field(default_factory=list)
    char_start: int
    char_end: int


class OpenVikingNotebookSearchResponse(BaseModel):
    items: list[OpenVikingNotebookSearchItem] = Field(default_factory=list)


class OpenVikingNotebookReindexResponse(BaseModel):
    notes_indexed: int


@router.post("/notebook/reindex", response_model=OpenVikingNotebookReindexResponse)
async def reindex_notebook_resources() -> OpenVikingNotebookReindexResponse:
    service = EmbeddedNotebookIngestService()
    result = service.reindex_all()
    return OpenVikingNotebookReindexResponse(notes_indexed=result.notes_indexed)


@router.get("/notebook/search", response_model=OpenVikingNotebookSearchResponse)
async def search_notebook_resources(
    query: str = Query(..., min_length=1),
    limit: int = Query(default=5, ge=1, le=20),
) -> OpenVikingNotebookSearchResponse:
    service = EmbeddedNotebookIngestService()
    results = service.search_notebook(query, limit=limit)
    return OpenVikingNotebookSearchResponse(
        items=[OpenVikingNotebookSearchItem.model_validate(result.model_dump()) for result in results]
    )
