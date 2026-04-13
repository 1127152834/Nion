from __future__ import annotations

from pydantic import BaseModel, Field


class SystemCapabilityObject(BaseModel):
    kind: str
    id: str
    label: str
    status: str = "available"
    actions: list[str] = Field(default_factory=list)
    query_tool: str | None = None
    mutation_tool: str | None = None
    cli_command: str | None = None
    aliases: list[str] = Field(default_factory=list)
    description: str = ""
