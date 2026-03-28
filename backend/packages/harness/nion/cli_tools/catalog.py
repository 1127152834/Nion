from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .models import CliToolDefinition


def _catalog_file() -> Path:
    return (
        Path(__file__).resolve().parents[5]
        / "shared"
        / "cli-tools"
        / "codepilot-cli-tools.json"
    )


@lru_cache(maxsize=1)
def _load_catalog_payload() -> dict:
    return json.loads(_catalog_file().read_text(encoding="utf-8"))


def list_catalog_tools() -> list[CliToolDefinition]:
    payload = _load_catalog_payload()
    return [
        CliToolDefinition.model_validate(item)
        for item in payload.get("catalog", [])
    ]


def get_catalog_tool(tool_id: str) -> CliToolDefinition | None:
    for tool in list_catalog_tools():
        if tool.id == tool_id:
            return tool
    return None


def list_extra_well_known_bins() -> list[tuple[str, str, str]]:
    payload = _load_catalog_payload()
    items = payload.get("extra_well_known_bins", [])
    return [
        (str(item[0]), str(item[1]), str(item[2]))
        for item in items
        if isinstance(item, list) and len(item) == 3
    ]

