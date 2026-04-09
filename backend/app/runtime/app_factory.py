from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import AbstractAsyncContextManager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.gateway.config import get_gateway_config

SharedLifespan = AbstractAsyncContextManager[AsyncGenerator[None, None], bool]
DEV_RENDERER_ORIGINS = ("http://127.0.0.1:5173", "http://localhost:5173")


def create_runtime_app(
    *,
    mode: str,
    title: str,
    description: str,
    version: str,
    lifespan: SharedLifespan | None = None,
    docs_url: str | None = None,
    redoc_url: str | None = None,
    openapi_url: str | None = None,
    openapi_tags: list[dict[str, str]] | None = None,
    shutdown_callback: Any = None,
) -> FastAPI:
    from app.daemon.routers import (
        channels,
        clients,
        control,
        diagnostics,
        incidents,
        logs,
        runtime,
    )
    from app.gateway.routers import (
        agents,
        artifacts,
        automation,
        capability_actions,
        capabilities,
        cli,
        config,
        desktop_system,
        files,
        mcp,
        memory,
        memory_growth,
        model_admin,
        models,
        notebook,
        recall,
        runtime_profile,
        skills,
        suggestions,
        threads,
        tool_policy,
        uploads,
    )

    app = FastAPI(
        title=title,
        description=description,
        version=version,
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        openapi_tags=openapi_tags,
    )
    app.state.daemon_shutdown_callback = shutdown_callback

    gateway_config = get_gateway_config()
    allowed_origins = list(
        dict.fromkeys([*gateway_config.cors_origins, *DEV_RENDERER_ORIGINS, "nion://app"])
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in (
        models.router,
        model_admin.router,
        config.router,
        runtime_profile.router,
        files.router,
        cli.router,
        mcp.router,
        memory.router,
        memory_growth.router,
        notebook.router,
        recall.router,
        automation.router,
        capability_actions.router,
        capabilities.router,
        tool_policy.router,
        skills.router,
        artifacts.router,
        uploads.router,
        agents.router,
        suggestions.router,
        threads.router,
    ):
        app.include_router(router)

    if mode == "web":
        app.include_router(desktop_system.router)

    if mode == "desktop":
        app.include_router(runtime.router)
        app.include_router(clients.router)
        app.include_router(control.router)
        if channels is not None:
            app.include_router(channels.router)
        app.include_router(logs.router)
        app.include_router(diagnostics.router)
        app.include_router(incidents.router)

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "service": f"nion-{mode}"}

    return app
