from nion.cli.tui.commands import build_palette_items


def test_palette_contains_commands_and_skills_in_one_list() -> None:
    items = build_palette_items(
        commands=["/new", "/help"],
        skills=[{"name": "ask", "description": "Async ask"}],
    )

    labels = [item["label"] for item in items]
    kinds = {item["label"]: item["kind"] for item in items}

    assert "/new" in labels
    assert "/help" in labels
    assert "/ask" in labels
    assert kinds["/new"] == "command"
    assert kinds["/ask"] == "skill"
