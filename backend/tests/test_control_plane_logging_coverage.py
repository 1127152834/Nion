from pathlib import Path


def test_control_plane_coverage_notes_exist_for_key_modules() -> None:
    text = (Path(__file__).resolve().parents[2] / "docs" / "desktop" / "development.md").read_text(encoding="utf-8")
    assert "daemon lifecycle events" in text
    assert "thread stream events" in text
    assert "delegated task lifecycle events" in text
    assert "subagent execution lifecycle events" in text
    assert "channel service lifecycle events" in text
    assert "channel message-bus events" in text
    assert "channel diagnostics" in text
    assert "channel runtime control actions" in text
    assert "task diagnostics" in text
    assert "skill mutation events" in text
    assert "config mutation events" in text
