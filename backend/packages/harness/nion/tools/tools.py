import logging

from langchain.tools import BaseTool

from nion.config import get_app_config
from nion.model_management.service import get_model_registry_service
from nion.reflection import resolve_variable
from nion.tools.builtins import (
    ask_clarification_tool,
    get_config_summary_tool,
    get_recent_logs_tool,
    get_runtime_status_tool,
    get_skill_diagnostics_tool,
    get_task_diagnostics_tool,
    get_thread_diagnostics_tool,
    list_skills_tool,
    present_file_tool,
    read_skill_tool,
    run_doctor_tool,
    task_tool,
    update_config_tool,
    update_skill_tool,
    view_image_tool,
)
from nion.tools.builtins.tool_search import reset_deferred_registry
from nion.tools.catalog import ToolCatalogEntry, build_configured_tool_catalog

logger = logging.getLogger(__name__)

BUILTIN_TOOLS = [
    present_file_tool,
    ask_clarification_tool,
    get_runtime_status_tool,
    get_recent_logs_tool,
    get_thread_diagnostics_tool,
    get_skill_diagnostics_tool,
    get_task_diagnostics_tool,
    list_skills_tool,
    read_skill_tool,
    get_config_summary_tool,
    run_doctor_tool,
    update_skill_tool,
    update_config_tool,
]

SUBAGENT_TOOLS = [
    task_tool,
    # task_status_tool is no longer exposed to LLM (backend handles polling internally)
]


def get_available_tools(
    groups: list[str] | None = None,
    include_mcp: bool = True,
    model_name: str | None = None,
    subagent_enabled: bool = False,
    surface: str = "workspace",
) -> list[BaseTool]:
    """Get all available tools from config.

    Note: MCP tools should be initialized at application startup using
    `initialize_mcp_tools()` from nion.mcp module.

    Args:
        groups: Optional list of tool groups to filter by.
        include_mcp: Whether to include tools from MCP servers (default: True).
        model_name: Optional model name to determine if vision tools should be included.
        subagent_enabled: Whether to include subagent tools (task, task_status).
        surface: Runtime surface used for configured-tool filtering.

    Returns:
        List of available tools.
    """
    config = get_app_config()
    loaded_tools = [resolve_variable(tool.use, BaseTool) for tool in config.tools if groups is None or tool.group in groups]
    configured_catalog = build_configured_tool_catalog(config)
    loaded_tools = _apply_surface_policy(config, surface, loaded_tools, configured_catalog)

    # Conditionally add tools based on config
    builtin_tools = BUILTIN_TOOLS.copy()

    # Add subagent tools only if enabled via runtime parameter
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
        logger.info(f"Including view_image_tool for model '{model_name}' (supports_vision=True)")

    # Get cached MCP tools if enabled
    # NOTE: We use ExtensionsConfig.from_file() instead of config.extensions
    # to always read the latest configuration from disk. This ensures that changes
    # made through the Gateway API (which runs in a separate process) are immediately
    # reflected when loading MCP tools.
    mcp_tools = []
    # Reset deferred registry upfront to prevent stale state from previous calls
    reset_deferred_registry()
    if include_mcp:
        try:
            from nion.config.extensions_config import ExtensionsConfig
            from nion.mcp.cache import get_cached_mcp_tools

            extensions_config = ExtensionsConfig.from_file()
            if extensions_config.get_enabled_mcp_servers():
                mcp_tools = get_cached_mcp_tools()
                if mcp_tools:
                    logger.info(f"Using {len(mcp_tools)} cached MCP tool(s)")

                    # When tool_search is enabled, register MCP tools in the
                    # deferred registry and add tool_search to builtin tools.
                    if config.tool_search.enabled:
                        from nion.tools.builtins.tool_search import DeferredToolRegistry, set_deferred_registry
                        from nion.tools.builtins.tool_search import tool_search as tool_search_tool

                        registry = DeferredToolRegistry()
                        for t in mcp_tools:
                            registry.register(t)
                        set_deferred_registry(registry)
                        builtin_tools.append(tool_search_tool)
                        logger.info(f"Tool search active: {len(mcp_tools)} tools deferred")
        except ImportError:
            logger.warning("MCP module not available. Install 'langchain-mcp-adapters' package to enable MCP tools.")
        except Exception as e:
            logger.error(f"Failed to get cached MCP tools: {e}")

    logger.info(f"Total tools loaded: {len(loaded_tools)}, built-in tools: {len(builtin_tools)}, MCP tools: {len(mcp_tools)}")
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
