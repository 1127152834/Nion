from nion.cli.tui.references import parse_reference_trigger


def test_parse_reference_trigger_detects_skill_reference() -> None:
    parsed = parse_reference_trigger("Use @skill:research-helper now")

    assert parsed is not None
    assert parsed.kind == "skill"
    assert parsed.query == "research-helper"
