import logging

from langchain.tools import BaseTool

from nion.config import get_app_config
from nion.config.acp_config import get_acp_agents
from nion.model_management.service import get_model_registry_service
from nion.reflection import resolve_variable
from nion.tools.builtins import (
    approve_channel_pair_request_tool,
    ask_clarification_tool,
    cli_tools_add_tool,
    cli_tools_check_updates_tool,
    cli_tools_install_tool,
    cli_tools_list_tool,
    cli_tools_remove_tool,
    cli_tools_update_tool,
    diagnose_incident_tool,
    dismiss_incident_tool,
    get_channel_diagnostics_tool,
    get_channels_status_tool,
    get_config_summary_tool,
    get_incident_tool,
    get_recent_logs_tool,
    get_runtime_status_tool,
    get_skill_diagnostics_tool,
    get_task_diagnostics_tool,
    get_thread_diagnostics_tool,
    issue_channel_pairing_code_tool,
    list_channel_authorized_users_tool,
    list_channel_pair_requests_tool,
    list_incidents_tool,
    list_skills_tool,
    present_file_tool,
    read_skill_tool,
    reject_channel_pair_request_tool,
    restart_channel_control_plane_tool,
    revoke_channel_authorized_user_tool,
    run_doctor_tool,
    task_tool,
    update_config_tool,
    update_skill_tool,
    view_image_tool,
)
from nion.tools.builtins.invoke_acp_agent_tool import build_invoke_acp_agent_tool
from nion.tools.builtins.tool_search import reset_deferred_registry
from nion.tools.catalog import ToolCatalogEntry, build_configured_tool_catalog

logger = logging.getLogger(__name__)

BASE_BUILTIN_TOOLS = [
    present_file_tool,
    ask_clarification_tool,
    get_runtime_status_tool,
    diagnose_incident_tool,
    list_incidents_tool,
    get_incident_tool,
    dismiss_incident_tool,
    get_channels_status_tool,
    get_channel_diagnostics_tool,
    list_channel_pair_requests_tool,
    list_channel_authorized_users_tool,
    get_recent_logs_tool,
    get_thread_diagnostics_tool,
    get_skill_diagnostics_tool,
    get_task_diagnostics_tool,
    restart_channel_control_plane_tool,
    issue_channel_pairing_code_tool,
    approve_channel_pair_request_tool,
    reject_channel_pair_request_tool,
    revoke_channel_authorized_user_tool,
    list_skills_tool,
    read_skill_tool,
    get_config_summary_tool,
    run_doctor_tool,
    update_skill_tool,
    update_config_tool,
]

CLI_BUILTIN_TOOLS = [
    cli_tools_list_tool,
    cli_tools_install_tool,
    cli_tools_add_tool,
    cli_tools_remove_tool,
    cli_tools_check_updates_tool,
    cli_tools_update_tool,
]

SUBAGENT_TOOLS = [
    task_tool,
]


def get_available_tools(
    groups: list[str] | None = None,
    include_mcp: bool = True,
    model_name: str | None = None,
    subagent_enabled: bool = False,
    cli_tools_enabled: bool = False,
    surface: str = "workspace",
) -> list[BaseTool]:
    config = get_app_config()
    loaded_tools = [
        resolve_variable(tool.use, BaseTool)
        for tool in config.tools
        if groups is None or tool.group in groups
    ]
    configured_catalog = build_configured_tool_catalog(config)
    loaded_tools = _apply_surface_policy(config, surface, loaded_tools, configured_catalog)

    builtin_tools = BASE_BUILTIN_TOOLS.copy()
    if cli_tools_enabled:
        builtin_tools.extend(CLI_BUILTIN_TOOLS)

    acp_agents = get_acp_agents()
    if acp_agents:
        builtin_tools.append(build_invoke_acp_agent_tool(acp_agents))
        logger.info(
            "Including ACP invocation tool for %d configured ACP agent(s)",
            len(acp_agents),
        )

    if subagent_enabled:
        builtin_tools.extend(SUBAGENT_TOOLS)
        logger.info("Including subagent tools (task)")

    registry = get_model_registry_service(app_config_provider=get_app_config)
    resolved_model = None
    if model_name is None:
        try:
            resolved_model = registry.get_default_model()
            model_name = resolved_model.runtime_name
        except ValueError:
            resolved_model = None
    elif model_name:
        try:
            resolved_model = registry.resolve_model(model_name)
        except ValueError:
            resolved_model = None

    if resolved_model is not None and resolved_model.runtime_model_config.supports_vision:
        builtin_tools.append(view_image_tool)
        logger.info(
            "Including view_image_tool for model '%s' (supports_vision=True)",
            model_name,
        )

    mcp_tools = []
    reset_deferred_registry()
    if include_mcp:
        try:
            from nion.config.extensions_config import ExtensionsConfig
            from nion.mcp.cache import get_cached_mcp_tools

            extensions_config = ExtensionsConfig.from_file()
            if extensions_config.get_enabled_mcp_servers():
                mcp_tools = get_cached_mcp_tools()
                if mcp_tools:
                    logger.info("Using %d cached MCP tool(s)", len(mcp_tools))

                    if config.tool_search.enabled:
                        from nion.tools.builtins.tool_search import (
                            DeferredToolRegistry,
                            set_deferred_registry,
                        )
                        from nion.tools.builtins.tool_search import (
                            tool_search as tool_search_tool,
                        )

                        registry = DeferredToolRegistry()
                        for tool in mcp_tools:
                            registry.register(tool)
                        set_deferred_registry(registry)
                        builtin_tools.append(tool_search_tool)
                        logger.info(
                            "Tool search active: %d tools deferred",
                            len(mcp_tools),
                        )
        except ImportError:
            logger.warning(
                "MCP module not available. Install 'langchain-mcp-adapters' package to enable MCP tools."
            )
        except Exception as error:
            logger.error("Failed to get cached MCP tools: %s", error)

    logger.info(
        "Total tools loaded: %d, built-in tools: %d, MCP tools: %d",
        len(loaded_tools),
        len(builtin_tools),
        len(mcp_tools),
    )
    return loaded_tools + builtin_tools + mcp_tools


def _apply_surface_policy(
    config,
    surface: str,
    loaded_tools: list[BaseTool],
    catalog: dict[str, ToolCatalogEntry],
) -> list[BaseTool]:
    rule = config.surface_policy.get_rule(surface)
    allowed_groups = set(rule.allowed_groups or [])
    denied_groups = set(rule.denied_groups or [])
    allowed_tools = set(rule.allowed_tools or [])
    denied_tools = set(rule.denied_tools or [])

    filtered = []
    for tool in loaded_tools:
        entry = catalog.get(tool.name)
        if entry is None or not entry.policy_managed:
            filtered.append(tool)
            continue
        if tool.name in denied_tools or entry.group in denied_groups:
            continue
        if allowed_tools and tool.name not in allowed_tools:
            continue
        if allowed_groups and entry.group not in allowed_groups:
            continue
        filtered.append(tool)
    return filtered
