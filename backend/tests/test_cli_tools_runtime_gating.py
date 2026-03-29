from __future__ import annotations

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
            ]
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
