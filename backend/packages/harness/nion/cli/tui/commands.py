COMMANDS = [
    "/new",
    "/threads",
    "/switch",
    "/model",
    "/status",
    "/stop",
    "/retry",
    "/help",
]


def complete_command(prefix: str) -> list[str]:
    return [command for command in COMMANDS if command.startswith(prefix)]
