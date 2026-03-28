from __future__ import annotations

import os
import subprocess
import sys
import time
from shutil import which

from .catalog import list_catalog_tools, list_extra_well_known_bins
from .models import CliToolDefinition, CliToolRuntimeInfo

_CACHE_TTL_SECONDS = 120.0
_detect_cache: dict[str, object] | None = None


def _resolve_path(bin_name: str) -> str | None:
    return which(bin_name, path=os.environ.get("PATH"))


def _extract_version(bin_path: str) -> str | None:
    try:
        result = subprocess.run(
            [bin_path, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except Exception:
        return None

    version_text = (result.stdout or result.stderr or "").strip()
    if not version_text:
        return None
    first_line = version_text.splitlines()[0].strip()
    import re

    match = re.search(r"(\d+\.\d+[\w.\-]*)", first_line)
    return match.group(1) if match is not None else first_line[:50]


def detect_catalog_tool(tool: CliToolDefinition) -> CliToolRuntimeInfo:
    for bin_name in tool.binNames:
        bin_path = _resolve_path(bin_name)
        if not bin_path:
            continue
        return CliToolRuntimeInfo(
            id=tool.id,
            displayName=tool.name,
            status="installed",
            version=_extract_version(bin_path),
            binPath=bin_path,
        )

    return CliToolRuntimeInfo(
        id=tool.id,
        displayName=tool.name,
        status="not_installed",
        version=None,
        binPath=None,
    )


def detect_binary(tool_id: str, bin_name: str) -> CliToolRuntimeInfo:
    bin_path = _resolve_path(bin_name)
    if not bin_path:
        return CliToolRuntimeInfo(
            id=tool_id,
            displayName=tool_id,
            status="not_installed",
            version=None,
            binPath=None,
        )
    return CliToolRuntimeInfo(
        id=tool_id,
        displayName=tool_id,
        status="installed",
        version=_extract_version(bin_path),
        binPath=bin_path,
    )


def detect_all_cli_tools(*, force_refresh: bool = False) -> dict[str, list[CliToolRuntimeInfo]]:
    global _detect_cache
    now = time.time()
    if (
        not force_refresh
        and _detect_cache is not None
        and now - float(_detect_cache["timestamp"]) < _CACHE_TTL_SECONDS
    ):
        return {
            "catalog": list(_detect_cache["catalog"]),  # type: ignore[arg-type]
            "extra": list(_detect_cache["extra"]),  # type: ignore[arg-type]
        }

    catalog_tools = list_catalog_tools()
    catalog = [detect_catalog_tool(tool) for tool in catalog_tools]
    catalog_bin_names = {bin_name for tool in catalog_tools for bin_name in tool.binNames}
    extra = []
    for tool_id, _name, bin_name in list_extra_well_known_bins():
        if bin_name in catalog_bin_names:
            continue
        runtime = detect_binary(tool_id, bin_name)
        if runtime.status == "installed":
            extra.append(runtime)

    _detect_cache = {
        "timestamp": now,
        "catalog": catalog,
        "extra": extra,
    }
    return {"catalog": catalog, "extra": extra}


def invalidate_detect_cache() -> None:
    global _detect_cache
    _detect_cache = None


def detect_brew() -> bool:
    if sys.platform not in {"darwin", "linux"}:
        return False
    return _resolve_path("brew") is not None
