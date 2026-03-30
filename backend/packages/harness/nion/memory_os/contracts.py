from __future__ import annotations

from pydantic import BaseModel, Field


class ProviderFamilyMeta(BaseModel):
    family: str
    display_name: str
    supported_domains: list[str] = Field(default_factory=list)
    supported_modes: list[str] = Field(default_factory=list)
