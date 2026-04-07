from nion.system_capability_catalog import build_system_capability_catalog


def test_system_capability_catalog_aggregates_cli_skill_and_mcp_surfaces() -> None:
    payload = build_system_capability_catalog(
        cli_tools_enabled=True,
        skill_count=3,
        mcp_servers=[
            {"name": "slack", "description": "Search Slack workspace conversations"},
        ],
    )

    assert payload["categories"] == ["cli", "skills", "mcp"]
    assert payload["capabilities"][0]["category"] == "cli"
    assert payload["capabilities"][1]["category"] == "skills"
    assert payload["capabilities"][2]["category"] == "mcp"


def test_system_capability_catalog_includes_capability_objects_projection() -> None:
    payload = build_system_capability_catalog(
        cli_tools_enabled=True,
        skill_count=2,
        mcp_servers=[{"name": "slack", "description": "Search Slack workspace conversations"}],
        agent_count=1,
    )

    assert payload["objects"][0]["kind"] == "memory"
    assert payload["objects"][1]["kind"] == "notebook"
    assert payload["discoverability"]["catalog_tool"] == "get_capability_catalog"
    assert payload["discoverability"]["actions_tool"] == "get_capability_actions"
