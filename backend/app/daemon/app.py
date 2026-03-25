from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.daemon.routers import clients, runtime
from app.daemon.service import LocalDaemonService
from app.gateway.config import get_gateway_config
from app.gateway.routers import config, threads


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    service = LocalDaemonService.from_app_config()
    app.state.daemon_service = service
    await service.start()
    yield
    await service.stop()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Nion Local Daemon",
        description="Single local runtime for the Nion desktop client.",
        version="0.1.0",
        lifespan=lifespan,
    )

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
    app.include_router(config.router)
    app.include_router(threads.router)
    return app
