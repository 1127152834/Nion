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


def build_palette_items(
    commands: list[str],
    skills: list[dict[str, str]],
) -> list[dict[str, str]]:
    items = [
        {
            "label": command,
            "kind": "command",
            "description": "",
        }
        for command in commands
    ]
    items.extend(
        {
            "label": f"/{skill['name']}",
            "kind": "skill",
            "description": skill.get("description", ""),
        }
        for skill in skills
        if skill.get("name")
    )
    return items
