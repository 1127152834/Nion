from nion.capability_objects import build_capability_objects


def test_capability_objects_keep_usage_and_actions() -> None:
    payload = build_capability_objects(
        skill_count=1,
        mcp_servers=[{"name": "slack", "description": "Search Slack workspace conversations"}],
        agent_count=1,
    )

    notebook_object = next(item for item in payload if item["kind"] == "notebook")
    skill_object = next(item for item in payload if item["kind"] == "skill")
    mcp_object = next(item for item in payload if item["kind"] == "mcp")

    assert notebook_object["actions"][0]["id"] == "bridge:notebook-to-memory"
    assert "Notebook is not memory" in notebook_object["usage"]["boundary"]
    assert "workflow package" in skill_object["usage"]["boundary"]
    assert mcp_object["discoverability"]["tool"] == "get_capability_catalog"
