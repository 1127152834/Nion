"""ACP-compatible external agent invocation tool."""

from __future__ import annotations

import logging
from typing import Annotated

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, InjectedToolArg, StructuredTool
from pydantic import BaseModel, Field

from nion.config.acp_config import ACPAgentConfig
from nion.orchestration.remote_agent_transport import (
    RemoteAgentTarget,
    resolve_remote_transport,
)

logger = logging.getLogger(__name__)


class _InvokeACPAgentInput(BaseModel):
    agent: str = Field(description="Name of the ACP agent to invoke")
    prompt: str = Field(description="The concise task prompt to send to the agent")

def build_invoke_acp_agent_tool(
    acp_agents: dict[str, ACPAgentConfig],
) -> BaseTool:
    """Create the ``invoke_acp_agent`` tool from configured ACP agents."""
    agent_lines = "\n".join(f"- {name}: {cfg.description}" for name, cfg in acp_agents.items())
    description = (
        "Invoke an external ACP-compatible agent and return its final response.\n\n"
        "Available agents:\n"
        f"{agent_lines}\n\n"
        "IMPORTANT: ACP agents operate in their own independent workspace. "
        "Do NOT include /mnt/user-data paths in the prompt. "
        "Give the agent a self-contained task description."
    )

    agents = dict(acp_agents)

    async def _invoke(
        agent: str,
        prompt: str,
        config: Annotated[RunnableConfig | None, InjectedToolArg] = None,
    ) -> str:
        if not prompt.strip():
            return "ACP prompt cannot be empty."

        agent_config = agents.get(agent)
        if agent_config is None:
            available = ", ".join(sorted(agents))
            return f"Unknown ACP agent '{agent}'. Configured agents: {available or '(none)'}"

        thread_id: str | None = ((config or {}).get("configurable") or {}).get("thread_id")
        transport = resolve_remote_transport(
            RemoteAgentTarget(
                kind="acp",
                agent_name=agent,
                acp_config=agent_config,
            )
        )
        return await transport.run(prompt, thread_id=thread_id)

    return StructuredTool.from_function(
        name="invoke_acp_agent",
        description=description,
        coroutine=_invoke,
        args_schema=_InvokeACPAgentInput,
    )
