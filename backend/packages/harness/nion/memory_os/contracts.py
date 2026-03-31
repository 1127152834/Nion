from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

CapabilitySupport = Literal["supported", "partial", "unsupported"]
ProviderHealth = Literal["healthy", "degraded", "error", "unknown"]


class ProviderCapabilityMatrix(BaseModel):
    memory_crud: CapabilitySupport
    memory_search: CapabilitySupport
    compact: CapabilitySupport
    rebuild: CapabilitySupport
    usage: CapabilitySupport
    runtime_status: CapabilitySupport
    notebook_resources: CapabilitySupport = "unsupported"
    autodream_entries: CapabilitySupport = "unsupported"


class ProviderFamilyMeta(BaseModel):
    family: str
    display_name: str
    supported_domains: list[str] = Field(default_factory=list)
    supported_modes: list[str] = Field(default_factory=list)
    capabilities: ProviderCapabilityMatrix
