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
