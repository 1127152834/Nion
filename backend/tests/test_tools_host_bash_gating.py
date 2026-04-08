from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path


def _load_tools_module():
    nion_pkg = sys.modules.setdefault("nion", types.ModuleType("nion"))

    config_module = types.ModuleType("nion.config")
    config_module.get_app_config = lambda: None
    sys.modules["nion.config"] = config_module

    acp_module = types.ModuleType("nion.config.acp_config")
    acp_module.get_acp_agents = lambda: {}
    sys.modules["nion.config.acp_config"] = acp_module

    model_registry_module = types.ModuleType("nion.model_management.service")
    model_registry_module.get_model_registry_service = lambda app_config_provider=None: type(
        "_Registry",
        (),
        {"get_default_model": staticmethod(lambda: (_ for _ in ()).throw(ValueError("no default model")))},
    )()
    sys.modules["nion.model_management.service"] = model_registry_module

    reflection_module = types.ModuleType("nion.reflection")
    reflection_module.resolve_variable = lambda use, base: None
    sys.modules["nion.reflection"] = reflection_module

    sandbox_security_module = types.ModuleType("nion.sandbox.security")
    sandbox_security_module.is_host_bash_allowed = lambda config=None: False
    sys.modules["nion.sandbox.security"] = sandbox_security_module

    builtins_module = types.ModuleType("nion.tools.builtins")
    builtin_names = [
        "approve_channel_pair_request_tool",
        "ask_clarification_tool",
        "cli_tools_add_tool",
        "cli_tools_check_updates_tool",
        "cli_tools_install_tool",
        "cli_tools_list_tool",
        "cli_tools_remove_tool",
        "cli_tools_update_tool",
        "diagnose_incident_tool",
        "dismiss_incident_tool",
        "get_channel_diagnostics_tool",
        "get_channels_status_tool",
        "get_config_summary_tool",
        "get_incident_tool",
        "get_recent_logs_tool",
        "get_runtime_status_tool",
        "get_skill_diagnostics_tool",
        "get_task_diagnostics_tool",
        "get_thread_diagnostics_tool",
        "issue_channel_pairing_code_tool",
        "list_channel_authorized_users_tool",
        "list_channel_pair_requests_tool",
        "list_incidents_tool",
        "list_skills_tool",
        "present_file_tool",
        "read_skill_tool",
        "reject_channel_pair_request_tool",
        "restart_channel_control_plane_tool",
        "revoke_channel_authorized_user_tool",
        "run_doctor_tool",
        "task_tool",
        "update_config_tool",
        "update_skill_tool",
        "view_image_tool",
    ]
    for name in builtin_names:
        setattr(builtins_module, name, type("_Builtin", (), {"name": name})())
    sys.modules["nion.tools.builtins"] = builtins_module

    invoke_acp_module = types.ModuleType("nion.tools.builtins.invoke_acp_agent_tool")
    invoke_acp_module.build_invoke_acp_agent_tool = lambda acp_agents: type("_Tool", (), {"name": "invoke_acp_agent"})()
    sys.modules["nion.tools.builtins.invoke_acp_agent_tool"] = invoke_acp_module

    tool_search_module = types.ModuleType("nion.tools.builtins.tool_search")
    tool_search_module.reset_deferred_registry = lambda: None
    sys.modules["nion.tools.builtins.tool_search"] = tool_search_module

    catalog_module = types.ModuleType("nion.tools.catalog")
    catalog_module.ToolCatalogEntry = object
    catalog_module.build_configured_tool_catalog = lambda _config: {"bash": type("_Entry", (), {"policy_managed": True, "group": "bash"})()}
    sys.modules["nion.tools.catalog"] = catalog_module

    tools_pkg = types.ModuleType("nion.tools")
    setattr(nion_pkg, "tools", tools_pkg)
    sys.modules["nion.tools"] = tools_pkg

    module_path = (
        Path(__file__).resolve().parents[1]
        / "packages"
        / "harness"
        / "nion"
        / "tools"
        / "tools.py"
    )
    spec = importlib.util.spec_from_file_location("test_tools_module", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_host_bash_tool_is_hidden_when_local_host_bash_is_not_allowed():
    module = _load_tools_module()

    class _Tool:
        name = "bash"

    fake_config = type(
        "_Config",
        (),
        {
            "tools": [type("_ToolConfig", (), {"group": "bash", "use": "nion.sandbox.tools:bash_tool"})],
            "surface_policy": type(
                "_Policy",
                (),
                {
                    "get_rule": staticmethod(
                        lambda _surface: type(
                            "_Rule",
                            (),
                            {
                                "allowed_groups": [],
                                "denied_groups": [],
                                "allowed_tools": [],
                                "denied_tools": [],
                            },
                        )()
                    )
                },
            )(),
            "tool_search": type("_ToolSearch", (), {"enabled": False})(),
        },
    )()

    module.get_app_config = lambda: fake_config
    module.resolve_variable = lambda _use, _base: _Tool()

    names = {tool.name for tool in module.get_available_tools(include_mcp=False, subagent_enabled=False)}

    assert "bash" not in names
