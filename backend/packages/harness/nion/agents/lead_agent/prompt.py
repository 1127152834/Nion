import logging

from nion.config.agents_config import get_builtin_agent
from nion.prompt_runtime import (
    AgentPromptProfile,
    PromptBuildContext,
    PromptSectionRegistry,
    PromptSectionRegistration,
    build_prompt_artifact,
)
from nion.prompt_sections import (
    CLI_TOOLS_CAPABILITY_PROMPT,
    CorePromptSectionProvider,
    ExtensionPromptSectionProvider,
    OverlayPromptSectionProvider,
    SYSTEM_PROMPT_TEMPLATE,
    SessionPromptSectionProvider,
    build_acp_section,
    build_a2a_section,
    build_current_notebook_note_section,
    build_notebook_assistant_overlay,
    build_subagent_section,
    build_user_selected_extensions_section,
    get_deferred_tools_prompt_section,
    get_skills_prompt_section,
)
from nion.subagents import get_available_subagent_names

logger = logging.getLogger(__name__)


def _build_subagent_section(max_concurrent: int) -> str:
    return build_subagent_section(
        max_concurrent,
        get_available_subagent_names_fn=get_available_subagent_names,
    )


def _get_memory_context(
    agent_name: str | None = None,
    *,
    thread_id: str | None = None,
    memory_read: bool = True,
) -> str:
    del agent_name
    if not memory_read:
        return ""
    try:
        from nion.memory_os.context_assembler import MemoryOSContextAssembler
        from nion.memory_os.repository import MemoryOSRepository
        from nion.config.paths import get_paths

        repo = MemoryOSRepository(get_paths().memory_os_index_db_file)
        pack = MemoryOSContextAssembler(repo).build_runtime_memory_pack(
            query="",
            thread_id=thread_id or "prompt-bootstrap",
            memory_read=memory_read,
        )
        block = pack.to_prompt_block()
        if block:
            return block
    except Exception as exc:
        logger.warning("Failed to load memory os context: %s", exc)

    return ""


def _build_notebook_assistant_overlay(agent_name: str | None) -> str:
    return build_notebook_assistant_overlay(agent_name)


def _build_current_notebook_note_section(
    agent_name: str | None,
    notebook_context: dict[str, object] | None,
) -> str:
    return build_current_notebook_note_section(agent_name, notebook_context)


def _resolve_agent_kind(
    *,
    agent_name: str | None,
    available_skills: set[str] | None,
    subagent_enabled: bool,
) -> str:
    if available_skills == {"bootstrap"}:
        return "bootstrap"
    if subagent_enabled and agent_name == "subagent":
        return "subagent"
    if get_builtin_agent(agent_name) is not None:
        return "builtin"
    return "lead"


def _resolve_prompt_profile(context: PromptBuildContext) -> AgentPromptProfile:
    profile_id = f"{context.agent_kind}.{context.agent_name or 'default'}"
    return AgentPromptProfile(
        profile_id=profile_id,
        kind=context.agent_kind,
        required_providers={
            "prompt.core",
            "prompt.session",
            "prompt.extensions",
            "prompt.overlays",
        },
    )


def _build_prompt_registry(
    *,
    agent_display_name: str,
    memory_context: str,
    subagent_enabled: bool,
    max_concurrent_subagents: int,
    cli_tools_enabled: bool,
    requested_skills: list[str] | None,
    selected_mcp_tools: list[str] | None,
    selected_cli_tools: list[str] | None,
    notebook_context: dict[str, object] | None,
    agent_name: str | None,
    available_skills: set[str] | None,
) -> PromptSectionRegistry:
    subagent_reminder = (
        "- **Orchestrator Mode**: You are a task orchestrator - decompose complex tasks into parallel sub-tasks. "
        f"**HARD LIMIT: max {max_concurrent_subagents} `task` calls per response.** "
        f"If >{max_concurrent_subagents} sub-tasks, split into sequential batches of ≤{max_concurrent_subagents}. Synthesize after ALL batches complete.\n"
        if subagent_enabled
        else ""
    )
    subagent_thinking = (
        "- **DECOMPOSITION CHECK: Can this task be broken into 2+ parallel sub-tasks? If YES, COUNT them. "
        f"If count > {max_concurrent_subagents}, you MUST plan batches of ≤{max_concurrent_subagents} and only launch the FIRST batch now. "
        f"NEVER launch more than {max_concurrent_subagents} `task` calls in one response.**\n"
        if subagent_enabled
        else ""
    )

    registry = PromptSectionRegistry()
    registry.register(
        PromptSectionRegistration(
            provider_id="prompt.core",
            provider=CorePromptSectionProvider(
                agent_display_name=agent_display_name,
                subagent_reminder=subagent_reminder,
                subagent_thinking=subagent_thinking,
            ),
            order_hint=10,
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider_id="prompt.session",
            provider=SessionPromptSectionProvider(memory_context=memory_context),
            order_hint=20,
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider_id="prompt.extensions",
            provider=ExtensionPromptSectionProvider(
                available_skills=available_skills,
                cli_tools_enabled=cli_tools_enabled,
                requested_skills=requested_skills,
                selected_mcp_tools=selected_mcp_tools,
                selected_cli_tools=selected_cli_tools,
            ),
            order_hint=30,
        )
    )
    registry.register(
        PromptSectionRegistration(
            provider_id="prompt.overlays",
            provider=OverlayPromptSectionProvider(
                agent_name=agent_name,
                notebook_context=notebook_context,
                subagent_enabled=subagent_enabled,
                max_concurrent_subagents=max_concurrent_subagents,
            ),
            order_hint=40,
        )
    )
    return registry


def apply_prompt_template(
    subagent_enabled: bool = False,
    max_concurrent_subagents: int = 3,
    *,
    cli_tools_enabled: bool = False,
    requested_skills: list[str] | None = None,
    selected_mcp_tools: list[str] | None = None,
    selected_cli_tools: list[str] | None = None,
    notebook_context: dict[str, object] | None = None,
    agent_name: str | None = None,
    available_skills: set[str] | None = None,
    thread_id: str | None = None,
    memory_read: bool = True,
) -> str:
    memory_context = _get_memory_context(
        agent_name,
        thread_id=thread_id,
        memory_read=memory_read,
    )
    context = PromptBuildContext(
        agent_name=agent_name,
        agent_kind=_resolve_agent_kind(
            agent_name=agent_name,
            available_skills=available_skills,
            subagent_enabled=subagent_enabled,
        ),
        subagent_enabled=subagent_enabled,
        cli_tools_enabled=cli_tools_enabled,
        available_skills=available_skills,
        max_concurrent_subagents=max_concurrent_subagents,
        surface="workspace",
        model_name=None,
        session_mode=None,
        memory_enabled=bool(memory_context),
        extensions_enabled=True,
    )
    profile = _resolve_prompt_profile(context)
    registry = _build_prompt_registry(
        agent_display_name=agent_name or "Nion 2.0",
        memory_context=memory_context,
        subagent_enabled=subagent_enabled,
        max_concurrent_subagents=max_concurrent_subagents,
        cli_tools_enabled=cli_tools_enabled,
        requested_skills=requested_skills,
        selected_mcp_tools=selected_mcp_tools,
        selected_cli_tools=selected_cli_tools,
        notebook_context=notebook_context,
        agent_name=agent_name,
        available_skills=available_skills,
    )
    sections = registry.build_sections(context, profile=profile)
    artifact = build_prompt_artifact(context=context, sections=sections)
    return artifact.full_prompt


__all__ = [
    "CLI_TOOLS_CAPABILITY_PROMPT",
    "SYSTEM_PROMPT_TEMPLATE",
    "_build_current_notebook_note_section",
    "_build_notebook_assistant_overlay",
    "_build_subagent_section",
    "_get_memory_context",
    "apply_prompt_template",
    "build_acp_section",
    "build_a2a_section",
    "build_user_selected_extensions_section",
    "get_available_subagent_names",
    "get_deferred_tools_prompt_section",
    "get_skills_prompt_section",
]
