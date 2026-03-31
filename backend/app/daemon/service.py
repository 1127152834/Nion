from __future__ import annotations

import asyncio
import os
from collections.abc import Awaitable, Callable
from typing import Any

from nion.config import get_app_config
from nion.telemetry.logger import make_event
from nion.telemetry.store import TelemetryStore

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
        self._telemetry_store: TelemetryStore | None = None
        self._shutdown_callback: Callable[[], Awaitable[None] | None] | None = None
        self._shutdown_task: asyncio.Task[None] | None = None
        self._active_thread_streams: set[str] = set()

    @classmethod
    def from_app_config(cls) -> LocalDaemonService:
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
            "working_directory": os.getcwd(),
            "allow_background_running": self.allow_background_running,
            "shutdown_grace_period_seconds": self.shutdown_grace_period_seconds,
            "clients": counts,
        }

    def register_client(self, client_id: str, client_type: str) -> dict[str, Any]:
        self.registry.register(client_id, client_type)
        self._record_event(
            category="client",
            level="info",
            event_type="client_registered",
            actor=client_type,
            client_id=client_id,
            message=f"{client_type.capitalize()} client registered",
            details={"client_type": client_type},
        )
        return {
            "client_id": client_id,
            "client_type": client_type,
            "clients": self.registry.snapshot(),
        }

    def heartbeat_client(self, client_id: str) -> bool:
        return self.registry.heartbeat(client_id)

    def unregister_client(self, client_id: str) -> dict[str, Any]:
        self.registry.unregister(client_id)
        self._record_event(
            category="client",
            level="info",
            event_type="client_unregistered",
            actor="system",
            client_id=client_id,
            message="Client unregistered",
            details={"client_id": client_id},
        )
        return {
            "accepted": True,
            "should_exit": self.registry.should_exit(),
            "clients": self.registry.snapshot(),
        }

    def has_active_runtime_work(self) -> bool:
        return bool(self._active_thread_streams)

    def record_thread_event(
        self,
        *,
        level: str,
        event_type: str,
        thread_id: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        if event_type == "thread_stream_started":
            self._active_thread_streams.add(thread_id)
        elif event_type in {"thread_stream_finished", "thread_stream_failed"}:
            self._active_thread_streams.discard(thread_id)
        self._record_event(
            category="thread",
            level=level,
            event_type=event_type,
            actor="system",
            thread_id=thread_id,
            message=message,
            details=details,
        )

    def set_shutdown_callback(
        self,
        callback: Callable[[], Awaitable[None] | None] | None,
    ) -> None:
        self._shutdown_callback = callback

    def attach_telemetry_store(self, store: TelemetryStore) -> None:
        self._telemetry_store = store
        self._record_event(
            category="daemon",
            level="info",
            event_type="daemon_service_initialized",
            actor="system",
            message="Daemon service initialized",
            details={
                "host": self.host,
                "port": self.port,
                "allow_background_running": self.allow_background_running,
                "shutdown_grace_period_seconds": self.shutdown_grace_period_seconds,
            },
        )

    @property
    def telemetry_store(self) -> TelemetryStore | None:
        return self._telemetry_store

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
        self._record_event(
            category="daemon",
            level="info",
            event_type="daemon_config_refreshed",
            actor="system",
            message="Background running setting refreshed",
            details={
                "allow_background_running": self.allow_background_running,
                "shutdown_grace_period_seconds": self.shutdown_grace_period_seconds,
            },
        )

    async def start(self) -> None:
        if self._shutdown_task is not None:
            return

        async def monitor() -> None:
            while True:
                await asyncio.sleep(0.5)
                if self.registry.should_exit():
                    self._record_event(
                        category="daemon",
                        level="warning",
                        event_type="daemon_shutdown_condition_met",
                        actor="system",
                        message="Shutdown condition met with no remaining clients",
                        details={"clients": self.registry.snapshot()},
                    )
                    if self._shutdown_callback is not None:
                        result = self._shutdown_callback()
                        if result is not None:
                            await result
                    return

        self._shutdown_task = asyncio.create_task(
            monitor(),
            name="local-daemon-shutdown-monitor",
        )

    async def stop(self) -> None:
        task = self._shutdown_task
        self._shutdown_task = None
        if task is None:
            return
        for pending in (task,):
            if pending is None:
                continue
            pending.cancel()
        for pending in (task,):
            if pending is None:
                continue
            try:
                await pending
            except asyncio.CancelledError:
                pass

    def _record_event(
        self,
        *,
        category: str,
        level: str,
        event_type: str,
        actor: str,
        message: str,
        details: dict[str, Any] | None = None,
        client_id: str | None = None,
        thread_id: str | None = None,
    ) -> None:
        if self._telemetry_store is None:
            return
        self._telemetry_store.record_event(
            make_event(
                category=category,
                level=level,  # type: ignore[arg-type]
                event_type=event_type,
                actor=actor,
                message=message,
                details=details or {},
                client_id=client_id,
                thread_id=thread_id,
            )
        )
