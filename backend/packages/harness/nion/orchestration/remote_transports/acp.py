from __future__ import annotations


class ACPTransport:
    kind = "acp"

    def __init__(self, *, agent_name: str) -> None:
        self.agent_name = agent_name
