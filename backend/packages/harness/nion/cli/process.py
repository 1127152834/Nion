from __future__ import annotations

import subprocess
import sys

import httpx

DEFAULT_DAEMON_BASE_URL = "http://127.0.0.1:43115"


def is_daemon_alive(base_url: str = DEFAULT_DAEMON_BASE_URL) -> bool:
    try:
        response = httpx.get(f"{base_url}/health", timeout=1.0)
        return response.is_success
    except httpx.HTTPError:
        return False


def ensure_daemon_running(base_url: str = DEFAULT_DAEMON_BASE_URL) -> str:
    if is_daemon_alive(base_url):
        return base_url

    subprocess.Popen(
        [sys.executable, "-m", "app.daemon.main"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        start_new_session=True,
    )
    return base_url
