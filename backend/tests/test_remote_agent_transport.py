import asyncio

import pytest

from nion.orchestration.remote_agent_transport import (
    RemoteAgentTarget,
    resolve_remote_transport,
)


def test_resolve_remote_transport_prefers_local_for_catalog_agents():
    target = RemoteAgentTarget(kind="local", agent_name="research-agent")
    transport = resolve_remote_transport(target)
    assert transport.kind == "local"


def test_a2a_transport_can_build_agent_card_url():
    from nion.orchestration.remote_transports.a2a import build_agent_card_url

    assert (
        build_agent_card_url("https://agents.example.com/worker")
        == "https://agents.example.com/worker/.well-known/agent-card.json"
    )


def test_a2a_transport_fetches_agent_card_via_injected_fetcher():
    from nion.orchestration.remote_transports.a2a import A2ADiscoveryTransport

    transport = A2ADiscoveryTransport(
        base_url="https://agents.example.com/worker",
        agent_card_fetcher=lambda url: {
            "name": "worker-agent",
            "version": "2026-04-12",
            "url": url,
        },
    )

    card = transport.fetch_agent_card()

    assert card.name == "worker-agent"
    assert card.version == "2026-04-12"
    assert card.url == "https://agents.example.com/worker/.well-known/agent-card.json"
    assert card.payload["url"] == card.url


def test_a2a_transport_run_is_explicitly_discovery_only():
    from nion.orchestration.remote_transports.a2a import A2ADiscoveryTransport

    transport = A2ADiscoveryTransport(base_url="https://agents.example.com/worker")

    with pytest.raises(NotImplementedError, match="discovery-only"):
        asyncio.run(transport.run("hello"))
