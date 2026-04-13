"""Memory API router with a grouped user-facing contract only."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from nion.memory_os.compat import build_memory_user_facing_payload, get_memory_os_config

router = APIRouter(prefix="/api", tags=["memory"])


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
