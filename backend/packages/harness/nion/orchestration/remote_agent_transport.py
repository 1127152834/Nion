from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

from nion.config.a2a_config import A2AAgentConfig
from nion.config.acp_config import ACPAgentConfig

TransportKind = Literal["local", "acp", "a2a"]


@dataclass(slots=True)
class RemoteAgentTarget:
    kind: TransportKind
    agent_name: str
    base_url: str | None = None
    acp_config: ACPAgentConfig | None = None
    a2a_config: A2AAgentConfig | None = None


class RemoteAgentTransport(Protocol):
    kind: TransportKind


@dataclass(slots=True)
class LocalTransport:
    kind: TransportKind = "local"


def resolve_remote_transport(target: RemoteAgentTarget) -> RemoteAgentTransport:
    if target.kind == "local":
        return LocalTransport()
    if target.kind == "acp":
        from nion.orchestration.remote_transports.acp import ACPTransport

        if target.acp_config is None:
            raise ValueError("ACP transport requires acp_config")
        return ACPTransport.from_config(
            agent_name=target.agent_name,
            agent_config=target.acp_config,
        )
    from nion.orchestration.remote_transports.a2a import A2ATransport

    if target.a2a_config is None:
        raise ValueError("A2A transport requires a2a_config")
    return A2ATransport.from_config(
        agent_name=target.agent_name,
        agent_config=target.a2a_config,
    )
