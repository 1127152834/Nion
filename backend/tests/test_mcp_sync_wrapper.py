import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from nion.mcp.tools import get_mcp_tools


class MockArgs(BaseModel):
    x: int = Field(...)


def test_async_only_mcp_tool_gets_sync_wrapper():
    async def mock_coro(x: int):
        return f"result:{x}"

    mock_tool = StructuredTool(
        name="demo",
        description="demo",
        args_schema=MockArgs,
        func=None,
        coroutine=mock_coro,
    )

    mock_client = MagicMock()
    mock_client.get_tools = AsyncMock(return_value=[mock_tool])

    with (
        patch("langchain_mcp_adapters.client.MultiServerMCPClient", return_value=mock_client),
        patch("nion.config.extensions_config.ExtensionsConfig.from_file"),
        patch("nion.mcp.tools.build_servers_config", return_value={"demo": {}}),
        patch(
            "nion.mcp.tools.get_initial_oauth_headers",
            new_callable=AsyncMock,
            return_value={},
        ),
    ):
        tools = asyncio.run(get_mcp_tools())

    assert tools[0].func is not None
    assert tools[0].func(x=7) == "result:7"
