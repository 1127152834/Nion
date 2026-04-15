import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.gateway.config import get_gateway_config
from app.gateway.routers import retrieval_models
from app.runtime.app_factory import create_runtime_app
from nion.config.app_config import get_app_config
from nion.memory_os.compat import finalize_legacy_cutover

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""

    # Load config and check necessary environment variables at startup
    try:
        get_app_config(process_name="gateway")
        logger.info("Configuration loaded successfully")
    except Exception as e:
        error_msg = f"Failed to load configuration during gateway startup: {e}"
        logger.exception(error_msg)
        raise RuntimeError(error_msg) from e
    config = get_gateway_config()
    finalize_legacy_cutover()
    logger.info(f"Starting API Gateway on {config.host}:{config.port}")

    # NOTE: MCP tools initialization is NOT done here because:
    # 1. Gateway doesn't use MCP tools - they are used by Agents in the LangGraph Server
    # 2. Gateway and LangGraph Server are separate processes with independent caches
    # MCP tools are lazily initialized in LangGraph Server when first needed

    yield

    logger.info("Shutting down API Gateway")


def create_app() -> FastAPI:
    app = create_runtime_app(
        mode="web",
        title="Nion API Gateway",
        description="""
## Nion API Gateway

API Gateway for Nion - A LangGraph-based AI agent backend with sandbox execution capabilities.

### Features

- **Models Management**: Query and retrieve available AI models
- **MCP Configuration**: Manage Model Context Protocol (MCP) server configurations
- **Memory Management**: Access and manage global memory data for personalized conversations
- **Skills Management**: Query and manage skills and their enabled status
- **Artifacts**: Access thread artifacts and generated files
- **Health Monitoring**: System health check endpoints

### Architecture

LangGraph requests are handled by nginx reverse proxy.
This gateway provides custom endpoints for models, MCP configuration, skills, and artifacts.
        """,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        openapi_tags=[
            {
                "name": "config",
                "description": "Manage configuration through the Config Center API",
            },
            {
                "name": "runtime-profile",
                "description": "Manage per-thread sandbox/host runtime profiles",
            },
            {
                "name": "files",
                "description": "Browse thread workdir files and related runtime roots",
            },
            {
                "name": "cli",
                "description": "Inspect runtime-visible CLI catalog metadata",
            },
            {
                "name": "model-admin",
                "description": "Manage provider templates, provider instances, provider models, and runtime bindings",
            },
            {
                "name": "models",
                "description": "Operations for querying available AI models and their configurations",
            },
            {
                "name": "mcp",
                "description": "Manage Model Context Protocol (MCP) server configurations",
            },
            {
                "name": "memory",
                "description": "Access and manage global memory data for personalized conversations",
            },
            {
                "name": "notebook",
                "description": "Manage the personal desktop notebook knowledge base",
            },
            {
                "name": "projects",
                "description": "Manage project work containers, execution plans, project threads, and project timeline state",
            },
            {
                "name": "recall",
                "description": "Search transcript recall results independently from structured memory",
            },
            {
                "name": "automation",
                "description": "Manage scheduled and manual automation jobs and their execution state",
            },
            {
                "name": "tool-policy",
                "description": "Inspect configured-tool surface policy and catalog metadata",
            },
            {
                "name": "skills",
                "description": "Manage skills and their configurations",
            },
            {
                "name": "artifacts",
                "description": "Access and download thread artifacts and generated files",
            },
            {
                "name": "uploads",
                "description": "Upload and manage user files for threads",
            },
            {
                "name": "agents",
                "description": "Create and manage custom agents with per-agent config and prompts",
            },
            {
                "name": "suggestions",
                "description": "Generate follow-up question suggestions for conversations",
            },
            {
                "name": "threads",
                "description": "Manage desktop-local thread metadata and streaming runtime access",
            },
            {
                "name": "desktop-system",
                "description": "Desktop helper health and runtime control endpoints",
            },
            {
                "name": "health",
                "description": "Health check and system status endpoints",
            },
        ],
    )
    app.include_router(retrieval_models.router)
    return app


# Create app instance for uvicorn
app = create_app()
