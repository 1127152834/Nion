"""A2A-compatible external agent invocation tool."""

from __future__ import annotations

import logging
from typing import Annotated

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, InjectedToolArg, StructuredTool
from pydantic import BaseModel, Field

from nion.config.a2a_config import A2AAgentConfig
from nion.orchestration.remote_agent_transport import (
    RemoteAgentTarget,
    resolve_remote_transport,
)

logger = logging.getLogger(__name__)


class _InvokeA2AAgentInput(BaseModel):
    agent: str = Field(description="Name of the A2A agent to invoke")
    prompt: str = Field(description="The concise task prompt to send to the agent")


def build_invoke_a2a_agent_tool(
    a2a_agents: dict[str, A2AAgentConfig],
) -> BaseTool:
    """Create the ``invoke_a2a_agent`` tool from configured A2A agents."""
    agent_lines = "\n".join(f"- {name}: {cfg.description}" for name, cfg in a2a_agents.items())
    description = (
        "Invoke an external A2A-compatible agent and return its final response.\n\n"
        "Available agents:\n"
        f"{agent_lines}\n\n"
        "IMPORTANT: A2A agents are remote runtimes. Give the agent a self-contained "
        "task description and do not assume direct access to the local Nion sandbox paths."
    )

    agents = dict(a2a_agents)

    async def _invoke(
        agent: str,
        prompt: str,
        config: Annotated[RunnableConfig | None, InjectedToolArg] = None,
    ) -> str:
        if not prompt.strip():
            return "A2A prompt cannot be empty."

        agent_config = agents.get(agent)
        if agent_config is None:
            available = ", ".join(sorted(agents))
            return f"Unknown A2A agent '{agent}'. Configured agents: {available or '(none)'}"

        thread_id: str | None = ((config or {}).get("configurable") or {}).get("thread_id")
        transport = resolve_remote_transport(
            RemoteAgentTarget(
                kind="a2a",
                agent_name=agent,
                a2a_config=agent_config,
            )
        )
        return await transport.run(prompt, thread_id=thread_id)

    return StructuredTool.from_function(
        name="invoke_a2a_agent",
        description=description,
        coroutine=_invoke,
        args_schema=_InvokeA2AAgentInput,
    )
