from nion.cli.tui.references import parse_file_reference_trigger


def test_parse_file_reference_trigger_detects_plain_at_prefix() -> None:
    parsed = parse_file_reference_trigger("Open @src/")

    assert parsed is not None
    assert parsed.query == "src/"
