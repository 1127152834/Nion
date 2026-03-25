from __future__ import annotations

from typing import Any

import httpx


def get_runtime_info(base_url: str) -> dict[str, Any]:
    response = httpx.get(f"{base_url}/api/daemon/runtime-info", timeout=5.0)
    response.raise_for_status()
    return response.json()


def stop_daemon(base_url: str) -> None:
    response = httpx.post(f"{base_url}/api/daemon/stop", timeout=5.0)
    response.raise_for_status()
