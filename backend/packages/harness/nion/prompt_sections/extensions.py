from __future__ import annotations

from dataclasses import dataclass

from nion.config.extensions_config import ExtensionsConfig
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

**Skill Execution Pattern:**
1. When a user query matches a skill's use case, immediately call `use_skill` with the matching skill name
2. You must not just mention the skill or skip directly to other tools
3. After `use_skill`, treat the returned skill content as the active workflow package for this turn
4. Load referenced resources from the same folder only when needed during execution
5. Follow the skill's instructions precisely
6. If the skill returns `allowed_tools`, treat them as the preferred tool lane for that workflow

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


def get_mcp_instruction_entries() -> list[dict[str, str]]:
    try:
        extensions_config = ExtensionsConfig.from_file()
    except Exception:
        return []

    entries: list[dict[str, str]] = []
    for server_name, server in extensions_config.get_enabled_mcp_servers().items():
        description = server.description.strip() if isinstance(server.description, str) else ""
        if not description:
            continue
        entries.append({"name": server_name, "description": description})
    return entries


def get_mcp_instructions_prompt_section() -> str:
    entries = get_mcp_instruction_entries()
    if not entries:
        return ""

    lines = ["<mcp-instructions>"]
    lines.append("Enabled MCP servers can influence how you should behave, not just which tools exist.")
    for entry in entries:
        lines.append(f"- {entry['name']}: {entry['description']}")
    lines.append("Prefer MCP tools when the task matches the server's described capability and the user selected or implied that workflow.")
    lines.append("</mcp-instructions>")
    return "\n".join(lines)


def get_system_capability_catalog_section(*, cli_tools_enabled: bool) -> str:
    capabilities: list[str] = [
        "- Knowledge base query: use query_knowledge_base for compiled wiki knowledge and graph-derived answers.",
    ]
    if cli_tools_enabled:
        capabilities.append("- CLI tool management: install, register, remove, inspect, and update local CLI tools.")

    mcp_entries = get_mcp_instruction_entries()
    if mcp_entries:
        capabilities.append("- MCP servers: behavior-aware tool surfaces from configured external runtimes.")

    if not capabilities:
        return ""

    lines = ["<system-capability-catalog>"]
    lines.append("Current system capability catalog:")
    lines.extend(capabilities)
    lines.append("Discovery workflow: if the user asks what capabilities, resources, notebooks, memory, skills, agents, or MCP surfaces exist, call `get_capability_catalog` first.")
    lines.append("If the user then needs to know which bridge or activation actions are available between those capabilities, call `get_capability_actions` next.")
    lines.append("Compressed capability guidance:")
    lines.append("- Notebook is not memory.")
    lines.append("- When the user asks about the compiled knowledge base, query wiki pages, or knowledge graph conclusions, use `query_knowledge_base` before falling back to notebook or memory summaries.")
    lines.append("- Skill is a workflow package.")
    lines.append("- MCP is not the default first choice.")
    lines.append("- Memory is for stable long-term facts, not scratch notes.")
    lines.append("Capability autopilot:")
    lines.append("- When the user states a goal, first auto-discover the relevant system capability instead of asking them to choose internal modules.")
    lines.append("- Prefer automatic use of notebook, memory, skills, MCP, and CLI lanes when they clearly help accomplish the goal.")
    lines.append("- Only ask for clarification when required information is genuinely missing.")
    lines.append("</system-capability-catalog>")
    return "\n".join(lines)


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


def build_a2a_section() -> str:
    try:
        from nion.config.a2a_config import get_a2a_agents

        agents = get_a2a_agents()
        if not agents:
            return ""
    except Exception:
        return ""

    return (
        "\n**A2A Agent Tasks (invoke_a2a_agent):**\n"
        "- A2A agents are remote runtimes reached through the A2A protocol.\n"
        "- Write self-contained prompts and do not assume they can see local `/mnt/user-data` paths.\n"
        "- Reuse the same thread when follow-up calls should continue the remote A2A context.\n"
        "- Use `invoke_a2a_agent` only when a configured A2A agent is actually needed.\n"
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
    lines.append("The user explicitly required the following capabilities for this turn. Treat them as binding user intent, not incidental mentions.")
    if normalized_skills:
        lines.append(f"Requested skills: {', '.join(normalized_skills)}.")
        lines.append("If the task matches one of these requested skills, you must call `use_skill` before doing the work.")
    if normalized_mcp_tools:
        lines.append(f"Selected MCP tools: {', '.join(normalized_mcp_tools)}.")
        lines.append("When the task touches these workflows, prefer those exact MCP tools before broader fallback options.")
    if normalized_cli_tools:
        lines.append(f"Selected CLI tools: {', '.join(normalized_cli_tools)}.")
        lines.append(
            "When the task touches these workflows, prefer those exact CLI tools before other shells or generic alternatives."
        )
        lines.append(
            "If bash is available in the current runtime, use bash to invoke those exact binaries directly instead of only mentioning or recommending them."
        )
        lines.append(
            "Do not claim the CLI is unavailable unless bash/tool policy actually blocks shell execution in the current runtime."
        )
    lines.append("Explain your actions as responses to this explicit user choice, not as incidental discovery.")
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

        mcp_instructions = get_mcp_instructions_prompt_section()
        if mcp_instructions:
            sections.append(
                PromptSection(
                    key="dynamic.mcp_instructions",
                    title=None,
                    content=mcp_instructions,
                    scope="session_dynamic",
                    layer="extension",
                    order=50,
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

        capability_catalog = get_system_capability_catalog_section(
            cli_tools_enabled=self.cli_tools_enabled,
        )
        if capability_catalog:
            sections.append(
                PromptSection(
                    key="dynamic.system_capability_catalog",
                    title=None,
                    content=capability_catalog,
                    scope="session_dynamic",
                    layer="extension",
                    order=55,
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

        a2a_section = build_a2a_section()
        if a2a_section:
            sections.append(
                PromptSection(
                    key="dynamic.a2a",
                    title=None,
                    content=a2a_section,
                    scope="session_dynamic",
                    layer="extension",
                    order=75,
                )
            )

        return sections
