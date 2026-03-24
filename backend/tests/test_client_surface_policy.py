from nion.client import NionClient


def test_client_surface_is_part_of_agent_cache_key():
    client = NionClient()

    workspace = client._get_runnable_config("thread-1", surface="workspace")
    automation = client._get_runnable_config("thread-1", surface="automation")

    assert workspace["configurable"]["surface"] == "workspace"
    assert automation["configurable"]["surface"] == "automation"
