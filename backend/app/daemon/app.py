from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from app.daemon.routers import channels, clients, control, diagnostics, incidents, logs, runtime
from app.daemon.service import LocalDaemonService
from app.runtime.app_factory import create_runtime_app
from nion.config.paths import get_paths
from nion.memory_os.compat import finalize_legacy_cutover
from nion.telemetry.store import TelemetryStore

logger = logging.getLogger(__name__)

try:
    from app.channels.service import start_channel_service, stop_channel_service
except ModuleNotFoundError:
    start_channel_service = None  # type: ignore[assignment]
    stop_channel_service = None  # type: ignore[assignment]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    finalize_legacy_cutover()
    service = LocalDaemonService.from_app_config()
    app.state.daemon_service = service
    service.attach_telemetry_store(TelemetryStore(get_paths().telemetry_db_file))
    shutdown_callback = getattr(app.state, "daemon_shutdown_callback", None)
    service.set_shutdown_callback(shutdown_callback)
    await service.start()
    try:
        if start_channel_service is None:
            logger.info(
                "Legacy backend channel runtime is unavailable on this branch; skipping channel service startup",
            )
        else:
            try:
                await start_channel_service()
            except Exception:
                logger.exception("No IM channels configured or channel service failed to start")
        yield
    finally:
        try:
            if stop_channel_service is not None:
                await stop_channel_service()
        except Exception:
            logger.exception("Failed to stop channel service")
        await service.stop()


def create_app(
    *,
    shutdown_callback: Any = None,
) -> FastAPI:
    return create_runtime_app(
        mode="desktop",
        title="Nion Local Daemon",
        description="Single local runtime for the Nion desktop client.",
        version="0.1.0",
        lifespan=lifespan,
        shutdown_callback=shutdown_callback,
    )
