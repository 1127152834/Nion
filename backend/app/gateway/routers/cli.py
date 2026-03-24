"""Minimal CLI catalog APIs for runtime-visible composer lane support."""

from __future__ import annotations

from shutil import which
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from nion.config import ConfigRepository

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
    allowed: bool = True
    installed: bool = False
    configured: bool = False
    source: str = "host-detected"
    description: str = ""
    path: str | None = None


class CliCatalogResponse(BaseModel):
    clis: dict[str, CliCatalogItem] = Field(default_factory=dict)


class CliCatalogUpdateRequest(BaseModel):
    enabled: bool = True
    description: str | None = None


def _load_cli_tool_overrides() -> tuple[dict[str, dict[str, Any]], str]:
    repo = ConfigRepository()
    config, version, _ = repo.read()
    cli_config = config.get("cli")
    if not isinstance(cli_config, dict):
        return {}, version
    tools = cli_config.get("tools")
    if not isinstance(tools, dict):
        return {}, version

    normalized: dict[str, dict[str, Any]] = {}
    for raw_key, raw_value in tools.items():
        key = str(raw_key).strip()
        if not key or not isinstance(raw_value, dict):
            continue
        normalized[key] = raw_value
    return normalized, version


def _save_cli_tool_override(
    cli_id: str,
    payload: CliCatalogUpdateRequest,
) -> None:
    repo = ConfigRepository()
    config, version, _ = repo.read()

    cli_config = config.get("cli")
    if not isinstance(cli_config, dict):
        cli_config = {}

    tools = cli_config.get("tools")
    if not isinstance(tools, dict):
        tools = {}

    override: dict[str, Any] = {
        "enabled": payload.enabled,
    }
    description = (payload.description or "").strip()
    if description:
        override["description"] = description

    tools[cli_id] = override
    cli_config["tools"] = tools
    config["cli"] = cli_config
    repo.write_with_warnings(config_dict=config, expected_version=version)


def _build_cli_catalog() -> dict[str, CliCatalogItem]:
    overrides, _ = _load_cli_tool_overrides()
    defaults = {cli_name: description for cli_name, description in DEFAULT_CLI_CANDIDATES}
    candidate_ids = sorted(set(defaults) | set(overrides))

    clis: dict[str, CliCatalogItem] = {}
    for cli_id in candidate_ids:
        detected_path = which(cli_id)
        override = overrides.get(cli_id, {})
        allowed = bool(override.get("enabled", True))
        installed = detected_path is not None
        description = str(override.get("description") or defaults.get(cli_id) or "CLI tool").strip()
        source = "configured" if cli_id in overrides else "host-detected"
        clis[cli_id] = CliCatalogItem(
            id=cli_id,
            enabled=bool(installed and allowed),
            allowed=allowed,
            installed=installed,
            configured=cli_id in overrides,
            source=source,
            description=description,
            path=detected_path,
        )
    return clis


@router.get("/cli/catalog", response_model=CliCatalogResponse)
async def get_cli_catalog() -> CliCatalogResponse:
    return CliCatalogResponse(clis=_build_cli_catalog())


@router.put("/cli/catalog/{cli_id}", response_model=CliCatalogItem)
async def update_cli_catalog_item(
    cli_id: str,
    payload: CliCatalogUpdateRequest,
) -> CliCatalogItem:
    normalized_id = cli_id.strip()
    if not normalized_id:
        raise ValueError("cli_id must not be empty")
    _save_cli_tool_override(normalized_id, payload)
    catalog = _build_cli_catalog()
    return catalog.get(
        normalized_id,
        CliCatalogItem(
            id=normalized_id,
            enabled=False,
            allowed=payload.enabled,
            installed=False,
            configured=True,
            source="configured",
            description=(payload.description or "").strip() or "CLI tool",
            path=None,
        ),
    )
