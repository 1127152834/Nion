from __future__ import annotations

from collections.abc import Generator
from typing import Any

import httpx

from .tui.stream import iter_sse_events


def get_runtime_info(base_url: str) -> dict[str, Any]:
    response = httpx.get(f"{base_url}/api/daemon/runtime-info", timeout=5.0)
    response.raise_for_status()
    return response.json()


def stop_daemon(base_url: str) -> None:
    response = httpx.post(f"{base_url}/api/daemon/stop", timeout=5.0)
    response.raise_for_status()


def build_threads_base_url(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/api/threads"


class DaemonApiClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def get_runtime_info(self) -> dict[str, Any]:
        return get_runtime_info(self.base_url)

    def stop(self) -> None:
        stop_daemon(self.base_url)

    def search_threads(self, *, limit: int = 50) -> list[dict[str, Any]]:
        response = httpx.post(
            f"{build_threads_base_url(self.base_url)}/search",
            json={"limit": limit},
            timeout=5.0,
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, list):
            return payload
        return []

    def get_thread_state(self, thread_id: str) -> dict[str, Any]:
        response = httpx.get(
            f"{build_threads_base_url(self.base_url)}/{thread_id}/state",
            timeout=5.0,
        )
        response.raise_for_status()
        return response.json()

    def list_models(self) -> list[dict[str, Any]]:
        response = httpx.get(f"{self.base_url}/api/models", timeout=5.0)
        response.raise_for_status()
        payload = response.json()
        return payload.get("models", []) if isinstance(payload, dict) else []

    def list_skills(self) -> list[dict[str, Any]]:
        response = httpx.get(f"{self.base_url}/api/skills", timeout=5.0)
        response.raise_for_status()
        payload = response.json()
        return payload.get("skills", []) if isinstance(payload, dict) else []

    def list_cli_tools(self) -> list[str]:
        response = httpx.get(f"{self.base_url}/api/cli/catalog", timeout=5.0)
        response.raise_for_status()
        payload = response.json()
        clis = payload.get("clis", {}) if isinstance(payload, dict) else {}
        if isinstance(clis, dict):
            return sorted(clis.keys())
        return []

    def list_thread_files(self, thread_id: str, *, depth: int = 3) -> list[str]:
        response = httpx.get(
            f"{self.base_url}/api/threads/{thread_id}/files/tree",
            params={"depth": depth},
            timeout=5.0,
        )
        response.raise_for_status()
        payload = response.json() if response.content else {}
        files = payload.get("files", []) if isinstance(payload, dict) else []
        return [item.get("path", "") for item in files if isinstance(item, dict) and item.get("path")]

    def list_thread_paths(self, thread_id: str, *, depth: int = 3) -> list[str]:
        response = httpx.get(
            f"{self.base_url}/api/threads/{thread_id}/files/tree",
            params={"depth": depth},
            timeout=5.0,
        )
        response.raise_for_status()
        payload = response.json() if response.content else {}
        directories = payload.get("directories", []) if isinstance(payload, dict) else []
        files = payload.get("files", []) if isinstance(payload, dict) else []
        paths = [
            item.get("path", "")
            for item in [*directories, *files]
            if isinstance(item, dict) and item.get("path")
        ]
        return paths

    def stream_thread(
        self,
        thread_id: str,
        payload: dict[str, Any],
    ) -> Generator[dict[str, Any], None, None]:
        with httpx.stream(
            "POST",
            f"{build_threads_base_url(self.base_url)}/{thread_id}/stream",
            json=payload,
            timeout=None,
        ) as response:
            response.raise_for_status()
            yield from iter_sse_events(response.iter_lines())
