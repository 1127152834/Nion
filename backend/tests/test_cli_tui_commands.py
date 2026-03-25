from nion.cli.tui.commands import COMMANDS, complete_command


def test_complete_command_filters_by_prefix() -> None:
    assert "/new" in COMMANDS
    assert complete_command("/st") == ["/status", "/stop"]
