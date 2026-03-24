import json
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from nion.config.extensions_config import ExtensionsConfig, get_extensions_config, reload_extensions_config
from nion.mcp.client import build_server_params

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["mcp"])


class McpOAuthConfigResponse(BaseModel):
    """OAuth configuration for an MCP server."""

    enabled: bool = Field(default=True, description="Whether OAuth token injection is enabled")
    token_url: str = Field(default="", description="OAuth token endpoint URL")
    grant_type: Literal["client_credentials", "refresh_token"] = Field(default="client_credentials", description="OAuth grant type")
    client_id: str | None = Field(default=None, description="OAuth client ID")
    client_secret: str | None = Field(default=None, description="OAuth client secret")
    refresh_token: str | None = Field(default=None, description="OAuth refresh token")
    scope: str | None = Field(default=None, description="OAuth scope")
    audience: str | None = Field(default=None, description="OAuth audience")
    token_field: str = Field(default="access_token", description="Token response field containing access token")
    token_type_field: str = Field(default="token_type", description="Token response field containing token type")
    expires_in_field: str = Field(default="expires_in", description="Token response field containing expires-in seconds")
    default_token_type: str = Field(default="Bearer", description="Default token type when response omits token_type")
    refresh_skew_seconds: int = Field(default=60, description="Refresh this many seconds before expiry")
    extra_token_params: dict[str, str] = Field(default_factory=dict, description="Additional form params sent to token endpoint")


class McpServerConfigResponse(BaseModel):
    """Response model for MCP server configuration."""

    enabled: bool = Field(default=True, description="Whether this MCP server is enabled")
    type: str = Field(default="stdio", description="Transport type: 'stdio', 'sse', or 'http'")
    command: str | None = Field(default=None, description="Command to execute to start the MCP server (for stdio type)")
    args: list[str] = Field(default_factory=list, description="Arguments to pass to the command (for stdio type)")
    env: dict[str, str] = Field(default_factory=dict, description="Environment variables for the MCP server")
    url: str | None = Field(default=None, description="URL of the MCP server (for sse or http type)")
    headers: dict[str, str] = Field(default_factory=dict, description="HTTP headers to send (for sse or http type)")
    oauth: McpOAuthConfigResponse | None = Field(default=None, description="OAuth configuration for MCP HTTP/SSE servers")
    description: str = Field(default="", description="Human-readable description of what this MCP server provides")


class McpConfigResponse(BaseModel):
    """Response model for MCP configuration."""

    mcp_servers: dict[str, McpServerConfigResponse] = Field(
        default_factory=dict,
        description="Map of MCP server name to configuration",
    )


class McpConfigUpdateRequest(BaseModel):
    """Request model for updating MCP configuration."""

    mcp_servers: dict[str, McpServerConfigResponse] = Field(
        ...,
        description="Map of MCP server name to configuration",
    )


class McpServerProbeResponse(BaseModel):
    """Probe result for a single MCP server."""

    success: bool = Field(..., description="Whether the probe succeeded")
    message: str = Field(..., description="Probe result message")
    tool_count: int = Field(default=0, description="Number of discovered tools")
    tools: list[str] = Field(default_factory=list, description="Discovered tool names")


async def _probe_single_server(
    server_name: str,
    server_config: McpServerConfigResponse,
) -> McpServerProbeResponse:
    if not server_config.enabled:
        return McpServerProbeResponse(
            success=False,
            message="Server is disabled",
            tool_count=0,
            tools=[],
        )

    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient
    except ImportError:
        return McpServerProbeResponse(
            success=False,
            message="langchain-mcp-adapters is not installed",
            tool_count=0,
            tools=[],
        )

    try:
        params = build_server_params(
            server_name,
            ExtensionsConfig.model_validate(
                {"mcpServers": {server_name: server_config.model_dump()}},
            ).mcp_servers[server_name],
        )
        client = MultiServerMCPClient({server_name: params}, tool_name_prefix=True)
        tools = await client.get_tools()
        tool_names = sorted(
            [tool.name for tool in tools if getattr(tool, "name", None)],
        )
        return McpServerProbeResponse(
            success=True,
            message="Connected",
            tool_count=len(tool_names),
            tools=tool_names,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to probe MCP server %s: %s", server_name, exc)
        return McpServerProbeResponse(
            success=False,
            message=str(exc),
            tool_count=0,
            tools=[],
        )


@router.get(
    "/mcp/config",
    response_model=McpConfigResponse,
    summary="Get MCP Configuration",
    description="Retrieve the current Model Context Protocol (MCP) server configurations.",
)
async def get_mcp_configuration() -> McpConfigResponse:
    """Get the current MCP configuration.

    Returns:
        The current MCP configuration with all servers.

    Example:
        ```json
        {
            "mcp_servers": {
                "github": {
                    "enabled": true,
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-github"],
                    "env": {"GITHUB_TOKEN": "ghp_xxx"},
                    "description": "GitHub MCP server for repository operations"
                }
            }
        }
        ```
    """
    config = ExtensionsConfig.from_file()

    return McpConfigResponse(mcp_servers={name: McpServerConfigResponse(**server.model_dump()) for name, server in config.mcp_servers.items()})


@router.put(
    "/mcp/config",
    response_model=McpConfigResponse,
    summary="Update MCP Configuration",
    description="Update Model Context Protocol (MCP) server configurations and save to file.",
)
async def update_mcp_configuration(request: McpConfigUpdateRequest) -> McpConfigResponse:
    """Update the MCP configuration.

    This will:
    1. Save the new configuration to the mcp_config.json file
    2. Reload the configuration cache
    3. Reset MCP tools cache to trigger reinitialization

    Args:
        request: The new MCP configuration to save.

    Returns:
        The updated MCP configuration.

    Raises:
        HTTPException: 500 if the configuration file cannot be written.

    Example Request:
        ```json
        {
            "mcp_servers": {
                "github": {
                    "enabled": true,
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-github"],
                    "env": {"GITHUB_TOKEN": "$GITHUB_TOKEN"},
                    "description": "GitHub MCP server for repository operations"
                }
            }
        }
        ```
    """
    try:
        # Get the current config path (or determine where to save it)
        config_path = ExtensionsConfig.resolve_config_path()

        # If no config file exists, create one in the parent directory (project root)
        if config_path is None:
            config_path = Path.cwd().parent / "extensions_config.json"
            logger.info(f"No existing extensions config found. Creating new config at: {config_path}")

        # Load current config to preserve skills configuration
        current_config = get_extensions_config()

        # Convert request to dict format for JSON serialization
        config_data = {
            "mcpServers": {name: server.model_dump() for name, server in request.mcp_servers.items()},
            "skills": {name: {"enabled": skill.enabled} for name, skill in current_config.skills.items()},
        }

        # Write the configuration to file
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2)

        logger.info(f"MCP configuration updated and saved to: {config_path}")

        # NOTE: No need to reload/reset cache here - LangGraph Server (separate process)
        # will detect config file changes via mtime and reinitialize MCP tools automatically

        # Reload the configuration and update the global cache
        reloaded_config = reload_extensions_config()
        return McpConfigResponse(mcp_servers={name: McpServerConfigResponse(**server.model_dump()) for name, server in reloaded_config.mcp_servers.items()})

    except Exception as e:
        logger.error(f"Failed to update MCP configuration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update MCP configuration: {str(e)}")


@router.get(
    "/mcp/servers/{server_name}/probe",
    response_model=McpServerProbeResponse,
    summary="Probe MCP Server",
    description="Attempt to connect to a single MCP server and list discovered tools.",
)
async def probe_mcp_server(server_name: str) -> McpServerProbeResponse:
    config = ExtensionsConfig.from_file()
    server = config.mcp_servers.get(server_name)
    if server is None:
        raise HTTPException(status_code=404, detail=f"MCP server '{server_name}' not found")
    return await _probe_single_server(
        server_name,
        McpServerConfigResponse(**server.model_dump()),
    )
