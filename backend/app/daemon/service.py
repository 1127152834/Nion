from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

from nion.config import get_app_config

from .session_registry import SessionRegistry


class LocalDaemonService:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        allow_background_running: bool,
        shutdown_grace_period_seconds: int,
    ) -> None:
        self.host = host
        self.port = port
        self.allow_background_running = allow_background_running
        self.shutdown_grace_period_seconds = shutdown_grace_period_seconds
        self.registry = SessionRegistry(
            allow_background_running=allow_background_running,
            shutdown_grace_period_seconds=shutdown_grace_period_seconds,
        )
        self._shutdown_callback: Callable[[], Awaitable[None] | None] | None = None
        self._shutdown_task: asyncio.Task[None] | None = None

    @classmethod
    def from_app_config(cls) -> "LocalDaemonService":
        config = get_app_config()
        return cls(
            host=config.daemon.host,
            port=config.daemon.port,
            allow_background_running=config.daemon.allow_background_running,
            shutdown_grace_period_seconds=config.daemon.shutdown_grace_period_seconds,
        )

    @property
    def base_url(self) -> str:
        return f"http://{self.host}:{self.port}"

    @property
    def health_url(self) -> str:
        return f"{self.base_url}/health"

    def runtime_info(self) -> dict[str, Any]:
        counts = self.registry.snapshot()
        return {
            "mode": "local-daemon",
            "host": self.host,
            "port": self.port,
            "base_url": self.base_url,
            "health_url": self.health_url,
            "allow_background_running": self.allow_background_running,
            "shutdown_grace_period_seconds": self.shutdown_grace_period_seconds,
            "clients": counts,
        }

    def register_client(self, client_id: str, client_type: str) -> dict[str, Any]:
        self.registry.register(client_id, client_type)
        return {
            "client_id": client_id,
            "client_type": client_type,
            "clients": self.registry.snapshot(),
        }

    def heartbeat_client(self, client_id: str) -> bool:
        return self.registry.heartbeat(client_id)

    def unregister_client(self, client_id: str) -> dict[str, Any]:
        self.registry.unregister(client_id)
        return {
            "accepted": True,
            "should_exit": self.registry.should_exit(),
            "clients": self.registry.snapshot(),
        }

    def set_shutdown_callback(
        self,
        callback: Callable[[], Awaitable[None] | None] | None,
    ) -> None:
        self._shutdown_callback = callback

    def refresh_from_app_config(self) -> None:
        config = get_app_config()
        self.host = config.daemon.host
        self.port = config.daemon.port
        self.allow_background_running = config.daemon.allow_background_running
        self.shutdown_grace_period_seconds = config.daemon.shutdown_grace_period_seconds
        self.registry.set_allow_background_running(self.allow_background_running)
        self.registry.set_shutdown_grace_period_seconds(
            self.shutdown_grace_period_seconds
        )

    async def start(self) -> None:
        if self._shutdown_task is not None:
            return

        async def monitor() -> None:
            while True:
                await asyncio.sleep(0.5)
                if self.registry.should_exit():
                    if self._shutdown_callback is not None:
                        result = self._shutdown_callback()
                        if result is not None:
                            await result
                    return

        self._shutdown_task = asyncio.create_task(monitor(), name="local-daemon-shutdown-monitor")

    async def stop(self) -> None:
        task = self._shutdown_task
        self._shutdown_task = None
        if task is None:
            return
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
