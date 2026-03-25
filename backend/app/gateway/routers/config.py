"""Config center router."""

from __future__ import annotations

import logging
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from nion.config.config_repository import (
    ConfigRepository,
    ConfigValidationError,
    VersionConflictError,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["config"])


class ConfigSectionSchema(BaseModel):
    title: str
    description: str


class ConfigSchemaResponse(BaseModel):
    sections: dict[str, ConfigSectionSchema]
    order: list[str]


class ConfigReadResponse(BaseModel):
    version: str
    source_path: str
    yaml_text: str
    config: dict[str, Any]


class ConfigValidateErrorItem(BaseModel):
    path: list[str] = Field(default_factory=list)
    message: str
    type: str


class ConfigValidateWarningItem(BaseModel):
    path: list[str] = Field(default_factory=list)
    message: str
    type: str


class ConfigValidateRequest(BaseModel):
    config: dict[str, Any] | None = None
    yaml_text: str | None = None


class ConfigValidateResponse(BaseModel):
    valid: bool
    errors: list[ConfigValidateErrorItem] = Field(default_factory=list)
    warnings: list[ConfigValidateWarningItem] = Field(default_factory=list)
    config: dict[str, Any] | None = None
    yaml_text: str | None = None


class ConfigUpdateRequest(BaseModel):
    version: str
    config: dict[str, Any] | None = None
    yaml_text: str | None = None


class ConfigUpdateResponse(BaseModel):
    version: str
    source_path: str
    yaml_text: str
    config: dict[str, Any]
    warnings: list[ConfigValidateWarningItem] = Field(default_factory=list)


class ConfigRuntimeStatusResponse(BaseModel):
    process_name: str
    store_version: str | None = None
    store_source_path: str | None = None
    loaded_version: str | None = None
    loaded_source_path: str | None = None
    source_kind: str = "unknown"
    tools_count: int = 0
    loaded_tools: list[str] = Field(default_factory=list)
    last_loaded_at: str | None = None
    last_error: str | None = None
    runtime_processes: dict[str, dict[str, Any]] = Field(default_factory=dict)
    is_in_sync: bool = False
    warnings: list[str] = Field(default_factory=list)
    model_config = ConfigDict(extra="allow")


def _build_schema() -> ConfigSchemaResponse:
    sections = {
        "appearance": ConfigSectionSchema(
            title="Appearance",
            description="Configure theme and language surfaces.",
        ),
        "models": ConfigSectionSchema(
            title="Models",
            description="Configure available LLM models.",
        ),
        "session_policy": ConfigSectionSchema(
            title="Session policy",
            description="Configure title, summarization, and subagent policy.",
        ),
        "tools": ConfigSectionSchema(
            title="Tools",
            description="Configure tools and tool groups.",
        ),
        "mcp": ConfigSectionSchema(
            title="MCP servers",
            description="Manage MCP server connectivity and state.",
        ),
        "skills": ConfigSectionSchema(
            title="Skills",
            description="Configure skill directories and enabled state.",
        ),
        "sandbox": ConfigSectionSchema(
            title="Sandbox",
            description="Configure sandbox provider and runtime options.",
        ),
        "daemon": ConfigSectionSchema(
            title="Daemon",
            description="Configure local daemon lifecycle and background behavior.",
        ),
        "notification": ConfigSectionSchema(
            title="Notification",
            description="Configure notification preferences.",
        ),
        "advanced_yaml": ConfigSectionSchema(
            title="Advanced YAML",
            description="Inspect the raw YAML-equivalent config payload.",
        ),
    }
    order = [
        "appearance",
        "models",
        "session_policy",
        "tools",
        "mcp",
        "skills",
        "sandbox",
        "daemon",
        "notification",
        "advanced_yaml",
    ]
    return ConfigSchemaResponse(sections=sections, order=order)


def _to_yaml_text(config: dict[str, Any]) -> str:
    return yaml.safe_dump(config, sort_keys=False, allow_unicode=True)


def _resolve_config_payload(
    config: dict[str, Any] | None, yaml_text: str | None
) -> dict[str, Any]:
    if config is not None:
        return config
    if yaml_text is None:
        raise HTTPException(
            status_code=400, detail="Either config or yaml_text is required"
        )

    try:
        parsed = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {exc}") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="YAML root must be a mapping object")
    return parsed


@router.get("/config", response_model=ConfigReadResponse)
async def get_config() -> ConfigReadResponse:
    repo = ConfigRepository()
    config, version, source_path = repo.read()
    return ConfigReadResponse(
        version=version,
        source_path=str(source_path),
        yaml_text=_to_yaml_text(config),
        config=config,
    )


@router.get("/config/schema", response_model=ConfigSchemaResponse)
async def get_config_schema() -> ConfigSchemaResponse:
    return _build_schema()


@router.post("/config/validate", response_model=ConfigValidateResponse)
async def validate_config(request: ConfigValidateRequest) -> ConfigValidateResponse:
    repo = ConfigRepository()
    payload = _resolve_config_payload(request.config, request.yaml_text)
    errors_raw, warnings_raw = repo.validate_with_warnings(payload)
    errors = [ConfigValidateErrorItem(**item) for item in errors_raw]
    warnings = [ConfigValidateWarningItem(**item) for item in warnings_raw]
    if errors:
        return ConfigValidateResponse(valid=False, errors=errors, warnings=warnings)
    return ConfigValidateResponse(
        valid=True,
        errors=[],
        warnings=warnings,
        config=payload,
        yaml_text=_to_yaml_text(payload),
    )


@router.put("/config", response_model=ConfigUpdateResponse)
async def update_config(
    request: Request,
    payload: ConfigUpdateRequest,
) -> ConfigUpdateResponse:
    repo = ConfigRepository()
    config_payload = _resolve_config_payload(payload.config, payload.yaml_text)

    try:
        new_version, warnings_raw = repo.write_with_warnings(
            config_dict=config_payload, expected_version=payload.version
        )
        daemon_service = getattr(request.app.state, "daemon_service", None)
        if daemon_service is not None:
            daemon_service.refresh_from_app_config()
        warnings = [ConfigValidateWarningItem(**item) for item in warnings_raw]
        config, _, source_path = repo.read()
        return ConfigUpdateResponse(
            version=new_version,
            source_path=str(source_path),
            yaml_text=_to_yaml_text(config),
            config=config,
            warnings=warnings,
        )
    except VersionConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Config has been modified by another session. Refresh and retry.",
                "current_version": exc.current_version,
            },
        ) from exc
    except ConfigValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Config validation failed",
                "errors": exc.errors,
                "warnings": exc.warnings,
            },
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to update config: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update config") from exc


@router.get("/config/runtime-status", response_model=ConfigRuntimeStatusResponse)
async def get_runtime_status() -> ConfigRuntimeStatusResponse:
    repo = ConfigRepository()
    status_payload = repo.get_runtime_status()

    runtime_warnings: list[str] = []
    runtime_processes = status_payload.get("runtime_processes", {})
    if isinstance(runtime_processes, dict):
        for process_name, process_info in runtime_processes.items():
            if not isinstance(process_info, dict):
                continue
            if process_info.get("status") == "error":
                reason = process_info.get("reason") or "unknown runtime load error"
                runtime_warnings.append(f"{process_name}: {reason}")

    if not status_payload.get("is_in_sync"):
        runtime_warnings.append(
            "Current process config version is not in sync with storage version"
        )

    status_payload["warnings"] = runtime_warnings
    return ConfigRuntimeStatusResponse(**status_payload)
