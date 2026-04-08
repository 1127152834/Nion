from __future__ import annotations

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.thread_permissions import create_thread_permission_request
from nion.agents.lead_agent.prompt import apply_prompt_template
from nion.threads.repository import ThreadRepository
from nion.threads.service import ThreadService
from nion.threads.service import should_enable_cli_tools_for_request
from nion.tools.tools import get_available_tools


def test_cli_tools_runtime_gate_detects_explicit_cli_selection() -> None:
    assert (
        should_enable_cli_tools_for_request(
            "帮我处理这个任务",
            selected_cli_tools=["ffmpeg"],
        )
        is True
    )


def test_cli_tools_runtime_gate_detects_cli_management_intent() -> None:
    assert should_enable_cli_tools_for_request("帮我安装 stripe CLI") is True
    assert should_enable_cli_tools_for_request("check whether any cli tools need update") is True
    assert should_enable_cli_tools_for_request("打开这个 markdown 文件") is False


def test_cli_builtin_tools_are_not_exposed_without_cli_flag() -> None:
    tools = get_available_tools(include_mcp=False, subagent_enabled=False, cli_tools_enabled=False)
    names = {tool.name for tool in tools}

    assert "codepilot_cli_tools_list" not in names
    assert "codepilot_cli_tools_install" not in names
    assert "codepilot_cli_tools_add" not in names
    assert "codepilot_cli_tools_remove" not in names
    assert "codepilot_cli_tools_check_updates" not in names
    assert "codepilot_cli_tools_update" not in names


def test_cli_builtin_tools_are_exposed_with_cli_flag() -> None:
    tools = get_available_tools(include_mcp=False, subagent_enabled=False, cli_tools_enabled=True)
    names = {tool.name for tool in tools}

    assert "codepilot_cli_tools_list" in names
    assert "codepilot_cli_tools_install" in names
    assert "codepilot_cli_tools_add" in names
    assert "codepilot_cli_tools_remove" in names
    assert "codepilot_cli_tools_check_updates" in names
    assert "codepilot_cli_tools_update" in names


def test_host_bash_tool_is_hidden_when_local_host_bash_is_not_allowed(monkeypatch) -> None:
    from nion.tools import tools as tools_module

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

    fake_registry = type("_Registry", (), {"get_default_model": staticmethod(lambda: (_ for _ in ()).throw(ValueError("no default model")))})()

    monkeypatch.setattr(tools_module, "get_app_config", lambda: fake_config)
    monkeypatch.setattr(tools_module, "resolve_variable", lambda _use, _base: _Tool())
    monkeypatch.setattr(tools_module, "build_configured_tool_catalog", lambda _config: {"bash": type("_Entry", (), {"policy_managed": True, "group": "bash"})()})
    monkeypatch.setattr(tools_module, "get_model_registry_service", lambda app_config_provider=None: fake_registry)
    monkeypatch.setattr(tools_module, "is_host_bash_allowed", lambda config=None: False)

    names = {tool.name for tool in tools_module.get_available_tools(include_mcp=False, subagent_enabled=False)}

    assert "bash" not in names


def test_cli_capability_prompt_only_injected_when_enabled() -> None:
    prompt_without_cli = apply_prompt_template(cli_tools_enabled=False)
    prompt_with_cli = apply_prompt_template(cli_tools_enabled=True)

    assert "<cli-tools-capability>" not in prompt_without_cli
    assert "codepilot_cli_tools_install" not in prompt_without_cli

    assert "<cli-tools-capability>" in prompt_with_cli
    assert "codepilot_cli_tools_install" in prompt_with_cli


def test_thread_service_keeps_cli_tools_enabled_for_follow_up_turns(tmp_path) -> None:
    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread(
        "thread-1",
        values={
            "messages": [
                {
                    "type": "human",
                    "content": "帮我安装 stripe CLI",
                    }
                ],
                "cli_management": {
                    "active": True,
                    "phase": "managing",
                    "last_trigger": "install_intent",
                    "followup_turns_remaining": 2,
                    "updated_at": "2026-03-29T00:00:00+00:00",
                },
        },
    )

    service = ThreadService(repository=repository)

    assert (
        service._should_enable_cli_tools_for_request(  # noqa: SLF001 - direct runtime behavior check
            "继续",
            thread_id="thread-1",
            selected_cli_tools=[],
        )
        is True
    )


def test_thread_service_cli_context_enters_on_cli_management_turn(tmp_path) -> None:
    repository = ThreadRepository(base_dir=tmp_path)
    service = ThreadService(repository=repository)

    state = service.update_state(
        "thread-ctx-enter",
        {
            "cli_management": {
                "active": True,
                "phase": "managing",
                "last_trigger": "install_intent",
                "last_intent": "install",
                "followup_turns_remaining": 2,
                "updated_at": "2026-03-29T00:00:00+00:00",
            }
        },
    )

    assert state["values"]["cli_management"]["active"] is True
    assert state["values"]["cli_management"]["phase"] == "managing"
    assert state["values"]["cli_management"]["last_trigger"] == "install_intent"


def test_thread_service_cli_context_stays_active_for_short_follow_up(tmp_path) -> None:
    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread(
        "thread-ctx-follow",
        values={
            "messages": [{"type": "human", "content": "帮我安装 stripe CLI"}],
            "cli_management": {
                "active": True,
                "phase": "managing",
                "last_trigger": "install_intent",
                "last_intent": "install",
                "followup_turns_remaining": 2,
                "updated_at": "2026-03-29T00:00:00+00:00",
            },
        },
    )
    service = ThreadService(repository=repository)

    assert (
        service._should_enable_cli_tools_for_request(
            "继续",
            thread_id="thread-ctx-follow",
            selected_cli_tools=[],
        )
        is True
    )


def test_thread_service_cli_context_exits_after_non_cli_turn(tmp_path) -> None:
    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread(
        "thread-ctx-exit",
        values={
            "messages": [{"type": "human", "content": "帮我安装 stripe CLI"}],
            "cli_management": {
                "active": False,
                "phase": "inactive",
                "last_trigger": "completed",
                "followup_turns_remaining": 0,
                "updated_at": "2026-03-29T00:00:00+00:00",
            },
        },
    )
    service = ThreadService(repository=repository)

    assert (
        service._should_enable_cli_tools_for_request(
            "帮我总结今天的会议",
            thread_id="thread-ctx-exit",
            selected_cli_tools=[],
        )
        is False
    )


def test_thread_service_cli_context_stays_active_when_permission_retry_pending(tmp_path) -> None:
    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread(
        "thread-ctx-perm",
        values={
            "messages": [{"type": "human", "content": "帮我安装 stripe CLI"}],
            "cli_management": {
                "active": True,
                "phase": "awaiting_permission",
                "last_trigger": "permission_request",
                "last_intent": "install",
                "pending_permission_request_id": "perm-1",
                "followup_turns_remaining": 1,
                "updated_at": "2026-03-29T00:00:00+00:00",
            },
        },
    )
    service = ThreadService(repository=repository)

    assert (
        service._should_enable_cli_tools_for_request(
            "好的",
            thread_id="thread-ctx-perm",
            selected_cli_tools=[],
        )
        is True
    )


def test_cli_permission_resolve_clears_pending_state_and_restores_managing(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    repository = ThreadRepository(base_dir=tmp_path / "nion-home")
    repository.upsert_thread(
        "thread-cli-resolve",
        values={
            "messages": [{"type": "human", "content": "帮我安装 stripe CLI"}],
            "cli_management": {
                "active": True,
                "phase": "awaiting_permission",
                "last_trigger": "permission_request",
                "last_intent": "install",
                "pending_permission_request_id": "perm-placeholder",
                "followup_turns_remaining": 1,
                "updated_at": "2026-03-29T00:00:00+00:00",
            },
        },
    )
    request = create_thread_permission_request(
        thread_id="thread-cli-resolve",
        tool_name="codepilot_cli_tools_install",
        tool_input={"command": "brew install stripe/stripe-cli/stripe"},
        original_message_text="帮我安装 stripe CLI",
        replay_payload={
            "text": "帮我安装 stripe CLI",
            "files": [],
            "additional_kwargs": {
                "shortcut_selections": {
                    "cliTools": ["stripe"],
                }
            },
        },
    )
    repository.update_state(
        "thread-cli-resolve",
        {
            "cli_management": {
                "active": True,
                "phase": "awaiting_permission",
                "last_trigger": "permission_request",
                "last_intent": "install",
                "pending_permission_request_id": request.id,
                "followup_turns_remaining": 1,
                "updated_at": "2026-03-29T00:00:00+00:00",
            }
        },
    )

    with TestClient(create_app()) as client:
        response = client.post(
            f"/api/threads/thread-cli-resolve/permissions/{request.id}/resolve",
            json={"decision": "allow"},
        )

    assert response.status_code == 200

    updated = repository.get_thread("thread-cli-resolve")
    assert updated is not None
    assert updated.values.cli_management.phase == "managing"
    assert updated.values.cli_management.active is True
    assert updated.values.cli_management.pending_permission_request_id is None
