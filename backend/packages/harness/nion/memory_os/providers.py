from __future__ import annotations

from pydantic import BaseModel, Field


class ProviderInstanceConfig(BaseModel):
    id: str
    family: str
    name: str
    config: dict[str, object] = Field(default_factory=dict)


class MemoryOSState(BaseModel):
    active_provider_family: str = "builtin"
    active_provider_id: str | None = None
    providers: list[ProviderInstanceConfig] = Field(default_factory=list)
