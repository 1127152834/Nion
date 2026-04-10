"""Memory API router with a grouped user-facing contract plus legacy maintenance surfaces."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from nion.memory_os.compat import (
    build_legacy_memory_view,
    build_memory_user_facing_payload,
    clear_memory_os_memory,
    create_memory_os_fact,
    delete_memory_os_fact,
    get_memory_os_config,
    import_legacy_memory_into_memory_os,
    update_memory_os_fact,
)

router = APIRouter(prefix="/api", tags=["memory"])


class ContextSection(BaseModel):
    """Model for context sections (user and history)."""

    summary: str = Field(default="", description="Summary content")
    updatedAt: str = Field(default="", description="Last update timestamp")


class UserContext(BaseModel):
    """Model for user context."""

    workContext: ContextSection = Field(default_factory=ContextSection)
    personalContext: ContextSection = Field(default_factory=ContextSection)
    topOfMind: ContextSection = Field(default_factory=ContextSection)


class HistoryContext(BaseModel):
    """Model for history context."""

    recentMonths: ContextSection = Field(default_factory=ContextSection)
    earlierContext: ContextSection = Field(default_factory=ContextSection)
    longTermBackground: ContextSection = Field(default_factory=ContextSection)


class Fact(BaseModel):
    """Model for a memory fact."""

    id: str = Field(..., description="Unique identifier for the fact")
    content: str = Field(..., description="Fact content")
    category: str = Field(default="context", description="Fact category")
    confidence: float = Field(default=0.5, description="Confidence score (0-1)")
    createdAt: str = Field(default="", description="Creation timestamp")
    source: str = Field(default="unknown", description="Source thread ID")


class MemoryResponse(BaseModel):
    """Response model for memory data."""

    version: str = Field(default="1.0", description="Memory schema version")
    lastUpdated: str = Field(default="", description="Last update timestamp")
    user: UserContext = Field(default_factory=UserContext)
    history: HistoryContext = Field(default_factory=HistoryContext)
    facts: list[Fact] = Field(default_factory=list)


class MemoryUserFacingItem(BaseModel):
    id: str = Field(..., description="Stable identifier for the memory item")
    content: str = Field(..., description="User-facing memory content")
    source_label: str = Field(..., description="Human-readable source label")
    updated_at: str = Field(default="", description="Last update timestamp")
    reason: str = Field(default="", description="Why this item exists in memory")
    related_refs: list[str] = Field(default_factory=list, description="Related references")


class MemoryUserFacingResponse(BaseModel):
    user_profile: list[MemoryUserFacingItem] = Field(default_factory=list)
    long_term_background: list[MemoryUserFacingItem] = Field(default_factory=list)
    fact_memories: list[MemoryUserFacingItem] = Field(default_factory=list)


def _map_memory_fact_value_error(exc: ValueError) -> HTTPException:
    """Convert updater validation errors into stable API responses."""
    if exc.args and exc.args[0] == "confidence":
        detail = "Invalid confidence value; must be between 0 and 1."
    elif exc.args and exc.args[0] == "summary":
        detail = "Memory fact content cannot be empty."
    else:
        detail = "Memory fact content cannot be empty."
    return HTTPException(status_code=400, detail=detail)


class FactCreateRequest(BaseModel):
    """Request model for creating a memory fact."""

    content: str = Field(..., min_length=1, description="Fact content")
    category: str = Field(default="context", description="Fact category")
    confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="Confidence score (0-1)")


class FactPatchRequest(BaseModel):
    """PATCH request model that preserves existing values for omitted fields."""

    content: str | None = Field(default=None, min_length=1, description="Fact content")
    category: str | None = Field(default=None, description="Fact category")
    confidence: float | None = Field(default=None, ge=0.0, le=1.0, description="Confidence score (0-1)")


class MemoryConfigResponse(BaseModel):
    """Response model for memory configuration."""

    enabled: bool = Field(..., description="Whether memory is enabled")
    storage_path: str = Field(..., description="Path to memory storage file")
    debounce_seconds: int = Field(..., description="Debounce time for memory updates")
    max_facts: int = Field(..., description="Maximum number of facts to store")
    fact_confidence_threshold: float = Field(..., description="Minimum confidence threshold for facts")
    injection_enabled: bool = Field(..., description="Whether memory injection is enabled")
    max_injection_tokens: int = Field(..., description="Maximum tokens for memory injection")


class MemoryStatusResponse(BaseModel):
    """Response model for memory status."""

    config: MemoryConfigResponse
    data: MemoryUserFacingResponse


@router.get(
    "/memory",
    response_model=MemoryUserFacingResponse,
    summary="Get User-Facing Memory",
    description="Retrieve the grouped user-facing memory contract for the main Memory page.",
)
async def get_memory() -> MemoryUserFacingResponse:
    """Get grouped user-facing memory content for ordinary product surfaces."""
    return MemoryUserFacingResponse(**build_memory_user_facing_payload())


@router.post(
    "/memory/reload",
    response_model=MemoryUserFacingResponse,
    summary="Reload User-Facing Memory",
    description="Refresh the grouped user-facing memory payload from the canonical source.",
)
async def reload_memory() -> MemoryUserFacingResponse:
    """Reload memory data from file.

    This forces a reload of the memory data from the storage file,
    useful when the file has been modified externally.

    Returns:
        The reloaded memory data.
    """
    return MemoryUserFacingResponse(**build_memory_user_facing_payload())


@router.delete(
    "/memory",
    response_model=MemoryResponse,
    summary="Clear All Memory Data",
    description="Delete all saved memory data and reset the memory structure to an empty state.",
)
async def clear_memory() -> MemoryResponse:
    """Clear all persisted memory data."""

    try:
        memory_data = clear_memory_os_memory()
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to clear memory data.") from exc

    return MemoryResponse(**memory_data)


@router.post(
    "/memory/facts",
    response_model=MemoryResponse,
    summary="Create Memory Fact",
    description="Create a single saved memory fact manually.",
)
async def create_memory_fact_endpoint(request: FactCreateRequest) -> MemoryResponse:
    """Create a single fact manually."""
    try:
        memory_data = create_memory_os_fact(
            content=request.content,
            category=request.category,
            confidence=request.confidence,
        )
    except ValueError as exc:
        raise _map_memory_fact_value_error(exc) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to create memory fact.") from exc

    return MemoryResponse(**memory_data)


@router.delete(
    "/memory/facts/{fact_id}",
    response_model=MemoryResponse,
    summary="Delete Memory Fact",
    description="Delete a single saved memory fact by its fact id.",
)
async def delete_memory_fact_endpoint(fact_id: str) -> MemoryResponse:
    """Delete a single fact from memory by fact id."""

    try:
        memory_data = delete_memory_os_fact(fact_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory fact '{fact_id}' not found.") from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to delete memory fact.") from exc

    return MemoryResponse(**memory_data)


@router.patch(
    "/memory/facts/{fact_id}",
    response_model=MemoryResponse,
    summary="Patch Memory Fact",
    description="Partially update a single saved memory fact by its fact id while preserving omitted fields.",
)
async def update_memory_fact_endpoint(fact_id: str, request: FactPatchRequest) -> MemoryResponse:
    """Partially update a single fact manually."""
    try:
        memory_data = update_memory_os_fact(
            fact_id=fact_id,
            content=request.content,
            category=request.category,
            confidence=request.confidence,
        )
    except ValueError as exc:
        raise _map_memory_fact_value_error(exc) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory fact '{fact_id}' not found.") from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to update memory fact.") from exc

    return MemoryResponse(**memory_data)


@router.get(
    "/memory/export",
    response_model=MemoryResponse,
    summary="Export Memory Data",
    description="Export the current global memory data as JSON for backup or transfer.",
)
async def export_memory() -> MemoryResponse:
    """Export the current memory data."""
    return MemoryResponse(**build_legacy_memory_view())


@router.post(
    "/memory/import",
    response_model=MemoryResponse,
    summary="Import Memory Data",
    description="Import a full memory payload and persist it as the current memory state.",
)
async def import_memory(request: MemoryResponse) -> MemoryResponse:
    """Import and persist a memory payload."""
    try:
        memory_data = import_legacy_memory_into_memory_os(request.model_dump())
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to import memory data.") from exc

    return MemoryResponse(**memory_data)


@router.get(
    "/memory/config",
    response_model=MemoryConfigResponse,
    summary="Get Memory Configuration",
    description="Retrieve the current memory system configuration.",
)
async def get_memory_config_endpoint() -> MemoryConfigResponse:
    """Get the memory system configuration.

    Returns:
        The current memory configuration settings.

    Example Response:
        ```json
        {
            "enabled": true,
            "storage_path": ".nion/memory.json",
            "debounce_seconds": 30,
            "max_facts": 100,
            "fact_confidence_threshold": 0.7,
            "injection_enabled": true,
            "max_injection_tokens": 2000
        }
        ```
    """
    config = get_memory_os_config()
    return MemoryConfigResponse(
        **config,
    )


@router.get(
    "/memory/status",
    response_model=MemoryStatusResponse,
    summary="Get Memory Status",
    description="Retrieve memory configuration plus the grouped user-facing memory payload.",
)
async def get_memory_status() -> MemoryStatusResponse:
    """Get the memory system status including configuration and data.

    Returns:
        Combined memory configuration and current data.
    """
    config = get_memory_os_config()
    memory_data = build_memory_user_facing_payload()

    return MemoryStatusResponse(
        config=MemoryConfigResponse(**config),
        data=MemoryUserFacingResponse(**memory_data),
    )
