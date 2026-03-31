from __future__ import annotations

import asyncio
import os
from collections.abc import Awaitable, Callable
from typing import Any

from nion.config import get_app_config
from nion.heartbeat.service import HeartbeatService
from nion.self_maintenance.scheduler import SelfMaintenanceScheduler
from nion.telemetry.logger import make_event
from nion.telemetry.store import TelemetryStore

from .session_registry import SessionRegistry


class LocalDaemonService:
    HEARTBEAT_POLL_INTERVAL_SECONDS = 60.0

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
        self._self_maintenance_scheduler = SelfMaintenanceScheduler()
        self._heartbeat_service = HeartbeatService(
            run_maintenance=lambda: self._self_maintenance_scheduler.tick()
        )
        self._telemetry_store: TelemetryStore | None = None
        self._shutdown_callback: Callable[[], Awaitable[None] | None] | None = None
        self._shutdown_task: asyncio.Task[None] | None = None
        self._heartbeat_task: asyncio.Task[None] | None = None
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

    def autodream_status(self) -> dict[str, object]:
        return self.self_maintenance_status()

    def self_maintenance_status(self) -> dict[str, object]:
        return self._self_maintenance_scheduler.status()

    def heartbeat_status(self) -> dict[str, object]:
        return self._heartbeat_service.status()

    def record_autodream_session_completed(self) -> dict[str, object]:
        return self.record_self_maintenance_session_completed()

    def record_self_maintenance_session_completed(self) -> dict[str, object]:
        self._heartbeat_service.record_session_completed()
        state = self._self_maintenance_scheduler.record_session_completed()
        return {
            "last_run_at": state.last_run_at,
            "session_count_since_last_run": state.session_count_since_last_run,
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

        self._shutdown_task = asyncio.create_task(monitor(), name="local-daemon-shutdown-monitor")
        self._heartbeat_task = asyncio.create_task(
            self._heartbeat_monitor(),
            name="local-daemon-heartbeat-monitor",
        )

    async def stop(self) -> None:
        task = self._shutdown_task
        heartbeat_task = self._heartbeat_task
        self._shutdown_task = None
        self._heartbeat_task = None
        if task is None:
            if heartbeat_task is None:
                return
        for pending in (task, heartbeat_task):
            if pending is None:
                continue
            pending.cancel()
        for pending in (task, heartbeat_task):
            if pending is None:
                continue
            try:
                await pending
            except asyncio.CancelledError:
                pass

    async def _heartbeat_monitor(self) -> None:
        while True:
            await asyncio.sleep(self.HEARTBEAT_POLL_INTERVAL_SECONDS)
            if self.has_active_runtime_work():
                continue
            try:
                self._heartbeat_service.tick()
            except Exception:
                self._record_event(
                    category="heartbeat",
                    level="error",
                    event_type="heartbeat_tick_failed",
                    actor="system",
                    message="Heartbeat tick failed",
                    details=self.heartbeat_status(),
                )
                continue
            self._record_event(
                category="heartbeat",
                level="info",
                event_type="heartbeat_tick_completed",
                actor="system",
                message="Heartbeat tick completed",
                details=self.heartbeat_status(),
            )

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
