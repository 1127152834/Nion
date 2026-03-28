from __future__ import annotations

import asyncio

from nion.config.acp_config import ACPAgentConfig


def test_missing_acp_executable_returns_actionable_error():
    from nion.tools.builtins.invoke_acp_agent_tool import build_invoke_acp_agent_tool

    tool = build_invoke_acp_agent_tool(
        {
            "codex": ACPAgentConfig(
                command="definitely-missing-acp-binary",
                args=[],
                description="Codex ACP adapter",
            )
        }
    )

    result = asyncio.run(
        tool.coroutine(agent="codex", prompt="hello")
    )

    assert "not found" in result.lower()
    assert "definitely-missing-acp-binary" in result.lower()
