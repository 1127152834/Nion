from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import mcp as mcp_router
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path) -> None:
    path.write_text(
        json.dumps(
            {
                "mcpServers": {
                    "github": {
                        "enabled": True,
                        "type": "stdio",
                        "command": "npx",
                        "args": ["-y", "@modelcontextprotocol/server-github"],
                        "env": {"GITHUB_TOKEN": "$GITHUB_TOKEN"},
                        "description": "GitHub MCP server",
                    }
                },
                "skills": {},
            },
        ),
        encoding="utf-8",
    )


def test_mcp_config_api_round_trip_and_probe(monkeypatch, tmp_path):
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_extensions_config()

    async def _fake_probe(server_name, server_config):
        assert server_name == "github"
        assert server_config.command == "npx"
        return mcp_router.McpServerProbeResponse(
            success=True,
            message="Connected",
            tool_count=2,
            tools=["github__issues", "github__pull_requests"],
        )

    monkeypatch.setattr(mcp_router, "_probe_single_server", _fake_probe)

    try:
        with TestClient(create_app()) as client:
            get_response = client.get("/api/mcp/config")
            assert get_response.status_code == 200
            payload = get_response.json()
            assert "github" in payload["mcp_servers"]
            assert payload["mcp_servers"]["github"]["enabled"] is True

            put_response = client.put(
                "/api/mcp/config",
                json={
                    "mcp_servers": {
                        "github": {
                            "enabled": False,
                            "type": "stdio",
                            "command": "npx",
                            "args": ["-y", "@modelcontextprotocol/server-github"],
                            "env": {"GITHUB_TOKEN": "$GITHUB_TOKEN"},
                            "description": "GitHub MCP server",
                        },
                        "filesystem": {
                            "enabled": True,
                            "type": "stdio",
                            "command": "npx",
                            "args": ["-y", "@modelcontextprotocol/server-filesystem"],
                            "env": {},
                            "description": "Filesystem MCP server",
                        },
                    },
                },
            )
            assert put_response.status_code == 200
            updated = put_response.json()
            assert updated["mcp_servers"]["github"]["enabled"] is False
            assert "filesystem" in updated["mcp_servers"]

            probe_response = client.get("/api/mcp/servers/github/probe")
            assert probe_response.status_code == 200
            probe_payload = probe_response.json()
            assert probe_payload["success"] is True
            assert probe_payload["tool_count"] == 2
            assert probe_payload["tools"] == [
                "github__issues",
                "github__pull_requests",
            ]

            missing_response = client.get("/api/mcp/servers/missing/probe")
            assert missing_response.status_code == 404
    finally:
        reset_extensions_config()
