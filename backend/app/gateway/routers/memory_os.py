from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from nion.memory_os.service import MemoryOSService

router = APIRouter(prefix="/api/memory-os", tags=["memory-os"])


class MemoryProviderFamiliesResponse(BaseModel):
    families: list[dict[str, object]] = Field(default_factory=list)


class MemoryProviderStateResponse(BaseModel):
    active_provider_family: str
    active_provider_id: str | None = None
    providers: list[dict[str, object]] = Field(default_factory=list)


class MemoryProviderStateUpdateRequest(BaseModel):
    active_provider_family: str
    active_provider_id: str | None = None


@router.get("/providers/families", response_model=MemoryProviderFamiliesResponse)
async def list_provider_families() -> MemoryProviderFamiliesResponse:
    service = MemoryOSService()
    return MemoryProviderFamiliesResponse(
        families=[item.model_dump() for item in service.list_provider_families()]
    )


@router.get("/providers/state", response_model=MemoryProviderStateResponse)
async def get_provider_state() -> MemoryProviderStateResponse:
    service = MemoryOSService()
    return MemoryProviderStateResponse.model_validate(
        service.get_state().model_dump()
    )


@router.put("/providers/state", response_model=MemoryProviderStateResponse)
async def update_provider_state(
    payload: MemoryProviderStateUpdateRequest,
) -> MemoryProviderStateResponse:
    service = MemoryOSService()
    current = service.get_state()
    updated = service.update_state(
        current.model_copy(
            update={
                "active_provider_family": payload.active_provider_family,
                "active_provider_id": payload.active_provider_id,
            }
        )
    )
    return MemoryProviderStateResponse.model_validate(updated.model_dump())
