from __future__ import annotations


def build_agent_card_url(base_url: str) -> str:
    return base_url.rstrip("/") + "/.well-known/agent-card.json"


class A2ADiscoveryTransport:
    kind = "a2a"

    def __init__(self, *, base_url: str) -> None:
        self.base_url = base_url
