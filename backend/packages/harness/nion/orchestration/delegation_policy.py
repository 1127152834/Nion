from __future__ import annotations

from pydantic import BaseModel, Field

from nion.config.agents_config import AgentConfig


class DelegatedExecutionProfile(BaseModel):
    agent_name: str
    allow_direct_user_reply: bool = False
    allow_memory_write: bool = False
    allowed_private_skills: list[str] = Field(default_factory=list)
    soul_overlay: str = (
        "You are running as a delegated custom agent. "
        "Do not address the user directly. Return your work to the main agent."
    )
    effective_permissions: list[str] = Field(default_factory=list)


def build_delegated_execution_profile(
    agent_config: AgentConfig,
    *,
    caller_permissions: set[str],
) -> DelegatedExecutionProfile:
    allowed_private_skills = [
        skill
        for skill in agent_config.delegation.delegatable_private_skills
        if skill in agent_config.delegation.private_skills
    ]
    return DelegatedExecutionProfile(
        agent_name=agent_config.name,
        allow_direct_user_reply=agent_config.delegation.allow_direct_user_reply,
        allow_memory_write=agent_config.delegation.allow_memory_write,
        allowed_private_skills=allowed_private_skills,
        effective_permissions=sorted(caller_permissions),
    )
