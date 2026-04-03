from __future__ import annotations

from dataclasses import dataclass

from nion.prompt_runtime import PromptBuildContext, PromptSection
from nion.skills import load_skills

CLI_TOOLS_CAPABILITY_PROMPT = """<cli-tools-capability>
You have CLI tool management capabilities:
- codepilot_cli_tools_list: Query installed tools (supports format="json" for structured output)
- codepilot_cli_tools_install: Install new tools via package-manager shell command
- codepilot_cli_tools_add: Register an already-installed tool and save its description
- codepilot_cli_tools_remove: Remove a custom tool
- codepilot_cli_tools_check_updates: Check which tools have available updates
- codepilot_cli_tools_update: Update a tool to its latest version
After installing a tool, save a bilingual description when useful. If the tool requires authentication, guide the user through the setup steps.
</cli-tools-capability>"""


def get_skills_prompt_section(available_skills: set[str] | None = None) -> str:
    skills = load_skills(enabled_only=True)

    try:
        from nion.config import get_app_config

        config = get_app_config()
        container_base_path = config.skills.container_path
    except Exception:
        container_base_path = "/mnt/skills"

    if not skills:
        return ""

    if available_skills is not None:
        skills = [skill for skill in skills if skill.name in available_skills]

    skill_items = "\n".join(
        f"    <skill>\n        <name>{skill.name}</name>\n        <description>{skill.description}</description>\n        <location>{skill.get_container_file_path(container_base_path)}</location>\n    </skill>"
        for skill in skills
    )
    skills_list = f"<available_skills>\n{skill_items}\n</available_skills>"

    return f"""<skill_system>
You have access to skills that provide optimized workflows for specific tasks. Each skill contains best practices, frameworks, and references to additional resources.

**Progressive Loading Pattern:**
1. When a user query matches a skill's use case, immediately call `read_file` on the skill's main file using the path attribute provided in the skill tag below
2. Read and understand the skill's workflow and instructions
3. The skill file contains references to external resources under the same folder
4. Load referenced resources only when needed during execution
5. Follow the skill's instructions precisely

**Skills are located at:** {container_base_path}

{skills_list}

</skill_system>"""


def get_deferred_tools_prompt_section() -> str:
    from nion.tools.builtins.tool_search import get_deferred_registry

    try:
        from nion.config import get_app_config

        if not get_app_config().tool_search.enabled:
            return ""
    except FileNotFoundError:
        return ""

    registry = get_deferred_registry()
    if not registry:
        return ""

    names = "\n".join(entry.name for entry in registry.entries)
    return f"<available-deferred-tools>\n{names}\n</available-deferred-tools>"


def build_acp_section() -> str:
    try:
        from nion.config.acp_config import get_acp_agents

        agents = get_acp_agents()
        if not agents:
            return ""
    except Exception:
        return ""

    return (
        "\n**ACP Agent Tasks (invoke_acp_agent):**\n"
        "- ACP agents run outside `/mnt/user-data` in their own adapter-managed workspace.\n"
        "- Write self-contained prompts that do not assume direct access to the Nion sandbox paths.\n"
        "- Use `invoke_acp_agent` only when a configured ACP adapter is actually needed.\n"
    )


def _normalize_selected_entries(values: list[str] | None) -> list[str]:
    if not values:
        return []

    normalized = [value.strip() for value in values if isinstance(value, str) and value.strip()]
    deduped: list[str] = []
    seen: set[str] = set()
    for value in normalized:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)
    return deduped


def build_user_selected_extensions_section(
    *,
    requested_skills: list[str] | None,
    selected_mcp_tools: list[str] | None,
    selected_cli_tools: list[str] | None,
) -> str:
    normalized_skills = _normalize_selected_entries(requested_skills)
    normalized_mcp_tools = _normalize_selected_entries(selected_mcp_tools)
    normalized_cli_tools = _normalize_selected_entries(selected_cli_tools)

    if not normalized_skills and not normalized_mcp_tools and not normalized_cli_tools:
        return ""

    lines = ["<user-selected-extensions>"]
    lines.append(
        "The user explicitly selected these extensions for this turn. Treat them as user intent, not incidental mentions."
    )
    if normalized_skills:
        lines.append(f"Requested skills: {', '.join(normalized_skills)}.")
    if normalized_mcp_tools:
        lines.append(f"Selected MCP tools: {', '.join(normalized_mcp_tools)}.")
    if normalized_cli_tools:
        lines.append(f"Selected CLI tools: {', '.join(normalized_cli_tools)}.")
    lines.append(
        "When relevant, prefer using these selected skills/tools first and explain your work as if responding to that explicit user choice."
    )
    lines.append("</user-selected-extensions>")

    return "\n".join(lines)


@dataclass(slots=True)
class ExtensionPromptSectionProvider:
    available_skills: set[str] | None
    cli_tools_enabled: bool
    requested_skills: list[str] | None
    selected_mcp_tools: list[str] | None
    selected_cli_tools: list[str] | None
    provider_id: str = "prompt.extensions"

    def build(self, context: PromptBuildContext) -> list[PromptSection]:
        del context
        sections: list[PromptSection] = []

        skills_section = get_skills_prompt_section(self.available_skills)
        if skills_section:
            sections.append(
                PromptSection(
                    key="dynamic.skills",
                    title=None,
                    content=skills_section,
                    scope="session_dynamic",
                    layer="extension",
                    order=30,
                )
            )

        deferred_tools_section = get_deferred_tools_prompt_section()
        if deferred_tools_section:
            sections.append(
                PromptSection(
                    key="dynamic.deferred_tools",
                    title=None,
                    content=deferred_tools_section,
                    scope="session_dynamic",
                    layer="extension",
                    order=40,
                )
            )

        if self.cli_tools_enabled:
            sections.append(
                PromptSection(
                    key="dynamic.cli_tools",
                    title=None,
                    content=CLI_TOOLS_CAPABILITY_PROMPT,
                    scope="session_dynamic",
                    layer="extension",
                    order=60,
                )
            )

        user_selected_extensions = build_user_selected_extensions_section(
            requested_skills=self.requested_skills,
            selected_mcp_tools=self.selected_mcp_tools,
            selected_cli_tools=self.selected_cli_tools,
        )
        if user_selected_extensions:
            sections.append(
                PromptSection(
                    key="dynamic.user_selected_extensions",
                    title=None,
                    content=user_selected_extensions,
                    scope="session_dynamic",
                    layer="extension",
                    order=65,
                )
            )

        acp_section = build_acp_section()
        if acp_section:
            sections.append(
                PromptSection(
                    key="dynamic.acp",
                    title=None,
                    content=acp_section,
                    scope="session_dynamic",
                    layer="extension",
                    order=70,
                )
            )

        return sections
