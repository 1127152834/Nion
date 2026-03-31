from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from nion.memory_os.contracts import ProviderCapabilityMatrix, ProviderHealth
from nion.memory_os.providers import ProviderInstanceConfig
from nion.memory_os.service import MemoryOSService

router = APIRouter(prefix="/api/memory-os", tags=["memory-os"])


class MemoryProviderStatusSummaryResponse(BaseModel):
    provider: str
    runtime_mode: str = "unknown"
    health: ProviderHealth = "unknown"
    summary: str = ""


class MemoryProviderUsageSummaryResponse(BaseModel):
    provider: str
    summary: str = ""
    details: dict[str, object] = Field(default_factory=dict)


class MemoryProviderFamilyResponse(BaseModel):
    family: str
    display_name: str
    supported_domains: list[str] = Field(default_factory=list)
    supported_modes: list[str] = Field(default_factory=list)
    capabilities: ProviderCapabilityMatrix


class MemoryProviderRuntimeStateResponse(BaseModel):
    id: str
    family: str
    name: str
    config: dict[str, object] = Field(default_factory=dict)
    runtime_mode: str = "unknown"
    health: ProviderHealth = "unknown"
    capabilities: ProviderCapabilityMatrix
    status: dict[str, object] = Field(default_factory=dict)
    status_summary: MemoryProviderStatusSummaryResponse | None = None
    usage_summary: dict[str, object] = Field(default_factory=dict)


class ActiveMemoryProviderSummaryResponse(BaseModel):
    family: str
    display_name: str
    runtime_mode: str = "unknown"
    health: ProviderHealth = "unknown"
    capabilities: ProviderCapabilityMatrix
    status_summary: MemoryProviderStatusSummaryResponse | None = None
    usage_summary: dict[str, object] | None = None


class MemoryProviderFamiliesResponse(BaseModel):
    families: list[MemoryProviderFamilyResponse] = Field(default_factory=list)


class MemoryProviderStateResponse(BaseModel):
    active_provider_family: str
    active_provider_id: str | None = None
    active_provider: ActiveMemoryProviderSummaryResponse | None = None
    providers: list[MemoryProviderRuntimeStateResponse] = Field(default_factory=list)


class MemoryProviderStateUpdateRequest(BaseModel):
    active_provider_family: str
    active_provider_id: str | None = None
    providers: list[ProviderInstanceConfig] = Field(default_factory=list)


@router.get("/providers/families", response_model=MemoryProviderFamiliesResponse)
async def list_provider_families() -> MemoryProviderFamiliesResponse:
    service = MemoryOSService()
    return MemoryProviderFamiliesResponse(
        families=[
            MemoryProviderFamilyResponse.model_validate(item.model_dump())
            for item in service.list_provider_families()
        ]
    )


@router.get("/providers/state", response_model=MemoryProviderStateResponse)
async def get_provider_state() -> MemoryProviderStateResponse:
    service = MemoryOSService()
    return _build_provider_state_response(service)


@router.put("/providers/state", response_model=MemoryProviderStateResponse)
async def update_provider_state(
    payload: MemoryProviderStateUpdateRequest,
) -> MemoryProviderStateResponse:
    service = MemoryOSService()
    current = service.get_state()
    service.update_state(
        current.model_copy(
            update={
                "active_provider_family": payload.active_provider_family,
                "active_provider_id": payload.active_provider_id,
                "providers": payload.providers,
            }
        )
    )
    return _build_provider_state_response(service)


def _build_provider_state_response(service: MemoryOSService) -> MemoryProviderStateResponse:
    state = service.get_state()
    families = {item.family: item for item in service.list_provider_families()}
    providers = [
        MemoryProviderRuntimeStateResponse.model_validate(provider.model_dump())
        for provider in state.providers
    ]
    active_provider = next(
        (
            provider
            for provider in providers
            if provider.id == state.active_provider_id
            and provider.family == state.active_provider_family
        ),
        None,
    )
    family = families.get(state.active_provider_family)
    return MemoryProviderStateResponse(
        active_provider_family=state.active_provider_family,
        active_provider_id=state.active_provider_id,
        active_provider=_build_active_provider_summary(
            family=family,
            provider=active_provider,
        ),
        providers=providers,
    )


def _build_active_provider_summary(
    *,
    family: MemoryProviderFamilyResponse | None,
    provider: MemoryProviderRuntimeStateResponse | None,
) -> ActiveMemoryProviderSummaryResponse | None:
    if family is None and provider is None:
        return None

    if family is None and provider is not None:
        return ActiveMemoryProviderSummaryResponse(
            family=provider.family,
            display_name=provider.name,
            runtime_mode=provider.runtime_mode,
            health=provider.health,
            capabilities=provider.capabilities,
            status_summary=provider.status_summary,
            usage_summary=provider.usage_summary,
        )

    assert family is not None
    return ActiveMemoryProviderSummaryResponse(
        family=family.family,
        display_name=family.display_name,
        runtime_mode=provider.runtime_mode if provider is not None else "unknown",
        health=provider.health if provider is not None else "unknown",
        capabilities=(
            provider.capabilities if provider is not None else family.capabilities
        ),
        status_summary=provider.status_summary if provider is not None else None,
        usage_summary=provider.usage_summary if provider is not None else None,
    )
