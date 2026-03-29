"""CLI catalog compatibility routes plus full CodePilot-style CLI tools APIs."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

from nion.cli_tools import CliToolsService
from nion.cli_tools.models import CliToolCatalogProjectionItem
from nion.config import ConfigRepository

router = APIRouter(prefix="/api", tags=["cli"])


class CliCatalogResponse(BaseModel):
    clis: dict[str, CliToolCatalogProjectionItem] = Field(default_factory=dict)


class CliCatalogUpdateRequest(BaseModel):
    enabled: bool = True
    description: str | None = None


class CliToolsCatalogResponse(BaseModel):
    tools: list[dict[str, Any]] = Field(default_factory=list)


class CliToolsInstalledResponse(BaseModel):
    tools: list[dict[str, Any]] = Field(default_factory=list)
    extra: list[dict[str, Any]] = Field(default_factory=list)
    custom: list[dict[str, Any]] = Field(default_factory=list)
    descriptions: dict[str, dict[str, Any]] = Field(default_factory=dict)
    platform: str
    hasBrew: bool = False


class CliToolCustomCreateRequest(BaseModel):
    binPath: str
    name: str | None = None


class CliToolsBulkDescriptionsRequest(BaseModel):
    descriptions: dict[str, dict[str, str]]


class CliToolDescribeRequest(BaseModel):
    providerId: str | None = None
    model: str | None = None


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


def _save_cli_tool_override(cli_id: str, payload: CliCatalogUpdateRequest) -> None:
    repo = ConfigRepository()
    config, version, _ = repo.read()

    cli_config = config.get("cli")
    if not isinstance(cli_config, dict):
        cli_config = {}

    tools = cli_config.get("tools")
    if not isinstance(tools, dict):
        tools = {}

    override: dict[str, Any] = {"enabled": payload.enabled}
    description = (payload.description or "").strip()
    if description:
        override["description"] = description

    tools[cli_id] = override
    cli_config["tools"] = tools
    config["cli"] = cli_config
    repo.write_with_warnings(config_dict=config, expected_version=version)


def _get_cli_tools_service() -> CliToolsService:
    return CliToolsService()


@router.get("/cli/catalog", response_model=CliCatalogResponse)
async def get_cli_catalog() -> CliCatalogResponse:
    service = _get_cli_tools_service()
    overrides, _ = _load_cli_tool_overrides()
    return CliCatalogResponse(clis=service.list_catalog_projection(overrides=overrides))


@router.put("/cli/catalog/{cli_id}", response_model=CliToolCatalogProjectionItem)
async def update_cli_catalog_item(
    cli_id: str,
    payload: CliCatalogUpdateRequest,
) -> CliToolCatalogProjectionItem:
    normalized_id = cli_id.strip()
    if not normalized_id:
        raise HTTPException(status_code=400, detail="cli_id must not be empty")
    _save_cli_tool_override(normalized_id, payload)
    service = _get_cli_tools_service()
    overrides, _ = _load_cli_tool_overrides()
    catalog = service.list_catalog_projection(overrides=overrides)
    return catalog.get(
        normalized_id,
        CliToolCatalogProjectionItem(
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


@router.get("/cli-tools/catalog", response_model=CliToolsCatalogResponse)
async def get_cli_tools_catalog() -> CliToolsCatalogResponse:
    service = _get_cli_tools_service()
    return CliToolsCatalogResponse(tools=service.list_catalog())


@router.get("/cli-tools/installed", response_model=CliToolsInstalledResponse)
async def get_cli_tools_installed() -> CliToolsInstalledResponse:
    service = _get_cli_tools_service()
    return CliToolsInstalledResponse.model_validate(service.list_installed_payload())


@router.get("/cli-tools/describe-options")
async def get_cli_tools_describe_options() -> dict[str, Any]:
    return _get_cli_tools_service().list_describe_option_groups()


@router.post("/cli-tools/descriptions")
async def migrate_cli_tool_descriptions(
    payload: CliToolsBulkDescriptionsRequest,
) -> dict[str, int]:
    entries = []
    for tool_id, item in payload.descriptions.items():
        zh = str(item.get("zh", "")).strip()
        en = str(item.get("en", "")).strip()
        if not tool_id.strip() or not zh or not en:
            continue
        entries.append((tool_id.strip(), zh, en))
    _get_cli_tools_service().bulk_upsert_descriptions(entries)
    return {"migrated": len(entries)}


@router.get("/cli-tools/custom")
async def list_custom_cli_tools() -> dict[str, list[dict[str, Any]]]:
    service = _get_cli_tools_service()
    tools = [item.model_dump() for item in service.list_custom_tools()]
    return {"tools": tools}


@router.post("/cli-tools/custom")
async def create_custom_cli_tool(payload: CliToolCustomCreateRequest) -> dict[str, Any]:
    service = _get_cli_tools_service()
    try:
        tool = service.create_custom_tool(
            bin_path=payload.binPath,
            name=payload.name,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"tool": tool.model_dump()}


@router.delete("/cli-tools/custom/{tool_id}")
async def delete_custom_cli_tool(tool_id: str) -> dict[str, bool]:
    service = _get_cli_tools_service()
    if service.get_custom_tool(tool_id) is None:
        raise HTTPException(status_code=404, detail="Custom tool not found")
    service.delete_custom_tool(tool_id)
    return {"deleted": True}


@router.get("/cli-tools/{tool_id}/status")
async def get_cli_tool_status(tool_id: str) -> dict[str, Any]:
    runtime = _get_cli_tools_service().get_tool_status(tool_id)
    if runtime is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    return runtime.model_dump()


@router.get("/cli-tools/{tool_id}/detail")
async def get_cli_tool_detail(tool_id: str) -> dict[str, Any]:
    detail = _get_cli_tools_service().get_catalog_detail(tool_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    return detail


@router.post("/cli-tools/{tool_id}/install")
async def install_cli_tool(tool_id: str, payload: dict[str, str]) -> StreamingResponse:
    method = str(payload.get("method", "")).strip()
    if not method:
        raise HTTPException(status_code=400, detail="method is required")

    service = _get_cli_tools_service()

    async def event_stream() -> AsyncIterator[str]:
        try:
            for event_name, data in service.iter_install_stream(tool_id=tool_id, method=method):
                yield f"event: {event_name}\ndata: {json.dumps(data)}\n\n"
        except ValueError as error:
            yield f"event: error\ndata: {json.dumps(str(error))}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/cli-tools/{tool_id}/describe")
async def describe_cli_tool(
    tool_id: str,
    payload: CliToolDescribeRequest,
) -> dict[str, Any]:
    service = _get_cli_tools_service()
    resolved_model_name = payload.model
    if payload.providerId and payload.model:
        resolved_model_name = f"{payload.providerId}:{payload.model}"
    try:
        record = service.describe_tool(tool_id=tool_id, model_name=resolved_model_name)
    except ValueError as error:
        detail = str(error)
        status_code = 404 if detail == "Tool not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from error
    except Exception as error:  # pragma: no cover - runtime/provider failure path
        raise HTTPException(status_code=502, detail=str(error) or "Description generation failed") from error
    response: dict[str, Any] = {
        "zh": record.zh,
        "en": record.en,
    }
    if record.structured is not None:
        response["structured"] = record.structured.model_dump()
    return {"description": response}
