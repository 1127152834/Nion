"""Minimal CLI catalog APIs for runtime-visible composer lane support."""

from __future__ import annotations

from shutil import which

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["cli"])

DEFAULT_CLI_CANDIDATES = [
    ("python3", "Python runtime"),
    ("node", "Node.js runtime"),
    ("git", "Git version control"),
    ("pnpm", "pnpm package manager"),
    ("uv", "uv Python package manager"),
]


class CliCatalogItem(BaseModel):
    id: str
    enabled: bool = True
    source: str = "host-detected"
    description: str = ""


class CliCatalogResponse(BaseModel):
    clis: dict[str, CliCatalogItem] = Field(default_factory=dict)


@router.get("/cli/catalog", response_model=CliCatalogResponse)
async def get_cli_catalog() -> CliCatalogResponse:
    clis: dict[str, CliCatalogItem] = {}
    for cli_name, description in DEFAULT_CLI_CANDIDATES:
        if which(cli_name):
            clis[cli_name] = CliCatalogItem(
                id=cli_name,
                description=description,
            )
    return CliCatalogResponse(clis=clis)

