"""ACP-compatible external agent invocation tool."""

from __future__ import annotations

import shutil

from langchain.tools import tool

from nion.config.acp_config import ACPAgentConfig


def build_invoke_acp_agent_tool(
    acp_agents: dict[str, ACPAgentConfig],
):
    """Build the ACP invocation tool for the configured agents."""

    agent_names = ", ".join(sorted(acp_agents))

    @tool("invoke_acp_agent", parse_docstring=True)
    async def invoke_acp_agent_tool(agent: str, prompt: str) -> str:
        """Invoke a configured ACP-compatible external agent.

        Args:
            agent: The configured ACP agent name to invoke.
            prompt: The self-contained task prompt for the external agent.
        """

        if not prompt.strip():
            return "ACP prompt cannot be empty."

        agent_config = acp_agents.get(agent)
        if agent_config is None:
            return f"Unknown ACP agent '{agent}'. Configured agents: {agent_names or '(none)'}"

        if shutil.which(agent_config.command) is None:
            return (
                f"ACP adapter command '{agent_config.command}' was not found for agent '{agent}'. "
                "Install the adapter or update Agent Integrations settings."
            )

        return (
            f"ACP agent '{agent}' is configured and command '{agent_config.command}' is available. "
            "Full ACP session execution will be enabled by the runtime integration steps."
        )

    return invoke_acp_agent_tool
