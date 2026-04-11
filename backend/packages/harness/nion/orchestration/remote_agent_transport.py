from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

TransportKind = Literal["local", "acp", "a2a"]


@dataclass(slots=True)
class RemoteAgentTarget:
    kind: TransportKind
    agent_name: str
    base_url: str | None = None


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

        return ACPTransport(agent_name=target.agent_name)
    from nion.orchestration.remote_transports.a2a import A2ADiscoveryTransport

    return A2ADiscoveryTransport(base_url=target.base_url or "")
