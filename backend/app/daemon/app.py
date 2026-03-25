from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.daemon.routers import clients, control, runtime
from app.daemon.service import LocalDaemonService
from app.gateway.config import get_gateway_config
from app.gateway.routers import cli, config, files, models, skills, threads


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    service = LocalDaemonService.from_app_config()
    app.state.daemon_service = service
    shutdown_callback = getattr(app.state, "daemon_shutdown_callback", None)
    service.set_shutdown_callback(shutdown_callback)
    await service.start()
    yield
    await service.stop()


def create_app(
    *,
    shutdown_callback: Any = None,
) -> FastAPI:
    app = FastAPI(
        title="Nion Local Daemon",
        description="Single local runtime for the Nion desktop client.",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.daemon_shutdown_callback = shutdown_callback

    gateway_config = get_gateway_config()
    allowed_origins = list(dict.fromkeys([*gateway_config.cors_origins, "nion://app"]))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(runtime.router)
    app.include_router(clients.router)
    app.include_router(control.router)
    app.include_router(config.router)
    app.include_router(threads.router)
    app.include_router(models.router)
    app.include_router(skills.router)
    app.include_router(files.router)
    app.include_router(cli.router)
    return app
