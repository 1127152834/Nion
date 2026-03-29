from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from nion.openviking import (
    EmbeddedNotebookIngestService,
    RuntimeNotebookRetriever,
    build_context_pack_markdown,
)

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


class OpenVikingNotebookContextPreviewResponse(BaseModel):
    items: list[OpenVikingNotebookSearchItem] = Field(default_factory=list)
    markdown: str


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


@router.get(
    "/notebook/context-preview",
    response_model=OpenVikingNotebookContextPreviewResponse,
)
async def preview_notebook_context(
    query: str = Query(..., min_length=1),
    limit: int = Query(default=5, ge=1, le=20),
) -> OpenVikingNotebookContextPreviewResponse:
    retriever = RuntimeNotebookRetriever()
    pack = retriever.search(query, limit=limit)
    return OpenVikingNotebookContextPreviewResponse(
        items=[
            OpenVikingNotebookSearchItem(
                resource_uri=item.resource_uri,
                note_id="",
                title=item.title,
                source_relative_path=item.source_relative_path,
                updated_at=item.updated_at,
                snippet=item.snippet,
                heading_path=item.heading_path,
                char_start=0,
                char_end=0,
            )
            for item in pack.items
        ],
        markdown=build_context_pack_markdown(pack.items),
    )
