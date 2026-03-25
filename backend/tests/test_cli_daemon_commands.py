from nion.cli.main import build_parser


def test_cli_parser_exposes_daemon_commands_only() -> None:
    parser = build_parser()
    actions = [
        action
        for action in parser._actions
        if getattr(action, "choices", None)
    ]
    subcommands = next(action for action in actions if action.dest == "command")

    assert "daemon" in subcommands.choices
    assert "tui" not in subcommands.choices
