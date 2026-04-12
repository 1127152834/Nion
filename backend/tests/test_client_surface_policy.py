from nion.client import NionClient


def test_client_surface_is_part_of_agent_cache_key():
    client = NionClient()

    workspace = client._get_runnable_config("thread-1", surface="workspace")
    automation = client._get_runnable_config("thread-1", surface="automation")

    assert workspace["configurable"]["surface"] == "workspace"
    assert automation["configurable"]["surface"] == "automation"


def test_client_include_mcp_is_part_of_agent_cache_key():
    client = NionClient()

    with_mcp = client._get_runnable_config("thread-1", include_mcp=True)
    without_mcp = client._get_runnable_config("thread-1", include_mcp=False)

    assert with_mcp["configurable"]["include_mcp"] is True
    assert without_mcp["configurable"]["include_mcp"] is False
    assert client._build_agent_config_key(with_mcp["configurable"]) != client._build_agent_config_key(
        without_mcp["configurable"]
    )
