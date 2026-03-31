from __future__ import annotations

from pydantic import BaseModel, Field

from nion.memory_os.contracts import ProviderCapabilityMatrix, ProviderHealth


class ProviderInstanceConfig(BaseModel):
    id: str
    family: str
    name: str
    config: dict[str, object] = Field(default_factory=dict)


class MemoryOSState(BaseModel):
    active_provider_family: str = "builtin"
    active_provider_id: str | None = None
    providers: list[ProviderInstanceConfig] = Field(default_factory=list)


class ProviderRuntimeStatus(BaseModel):
    runtime_mode: str = "unknown"
    health: ProviderHealth = "unknown"
    provider: str
    summary: str = ""
    details: dict[str, object] = Field(default_factory=dict)


class ProviderUsageSummary(BaseModel):
    summary: str = ""
    details: dict[str, object] = Field(default_factory=dict)


class ProviderInstanceState(ProviderInstanceConfig):
    runtime_mode: str = "unknown"
    health: ProviderHealth = "unknown"
    capabilities: ProviderCapabilityMatrix
    status: dict[str, object] = Field(default_factory=dict)
    status_summary: dict[str, object] = Field(default_factory=dict)
    usage_summary: dict[str, object] = Field(default_factory=dict)


class MemoryOSRuntimeState(BaseModel):
    active_provider_family: str = "builtin"
    active_provider_id: str | None = None
    providers: list[ProviderInstanceState] = Field(default_factory=list)
