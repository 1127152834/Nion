from __future__ import annotations

from nion.thread_permissions import (
    consume_thread_pending_allow,
    create_thread_permission_request,
    get_thread_permission_profile,
    resolve_thread_permission_request,
)


def test_thread_permission_store_supports_allow_session_profile(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_permission_request(
        thread_id="thread-a",
        tool_name="codepilot_cli_tools_install",
        tool_input={"command": "brew install ffmpeg"},
        original_message_text="帮我安装 ffmpeg",
    )

    resolved = resolve_thread_permission_request(
        thread_id="thread-a",
        permission_request_id=request.id,
        decision="allow_session",
    )

    assert resolved is not None
    assert get_thread_permission_profile("thread-a") == "full_access"


def test_thread_permission_store_consumes_one_time_allow_once(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_permission_request(
        thread_id="thread-b",
        tool_name="codepilot_cli_tools_install",
        tool_input={"command": "brew install ffmpeg"},
        original_message_text="帮我安装 ffmpeg",
    )
    resolve_thread_permission_request(
        thread_id="thread-b",
        permission_request_id=request.id,
        decision="allow",
    )

    assert (
        consume_thread_pending_allow(
            thread_id="thread-b",
            tool_name="codepilot_cli_tools_install",
            tool_input={"command": "brew install ffmpeg"},
        )
        is True
    )
    assert (
        consume_thread_pending_allow(
            thread_id="thread-b",
            tool_name="codepilot_cli_tools_install",
            tool_input={"command": "brew install ffmpeg"},
        )
        is False
    )


def test_thread_permission_store_persists_replay_payload(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_permission_request(
        thread_id="thread-c",
        tool_name="codepilot_cli_tools_install",
        tool_input={"command": "brew install stripe/stripe-cli/stripe"},
        original_message_text="帮我安装 stripe CLI",
        replay_payload={
            "text": "帮我安装 stripe CLI",
            "files": [
                {
                    "filename": "notes.txt",
                    "path": "/mnt/user-data/uploads/notes.txt",
                    "size": 12,
                    "status": "uploaded",
                }
            ],
            "additional_kwargs": {
                "shortcut_selections": {
                    "cliTools": ["stripe"],
                }
            },
        },
    )

    assert request.replay_payload == {
        "text": "帮我安装 stripe CLI",
        "files": [
            {
                "filename": "notes.txt",
                "path": "/mnt/user-data/uploads/notes.txt",
                "size": 12,
                "status": "uploaded",
            }
        ],
        "additional_kwargs": {
            "shortcut_selections": {
                "cliTools": ["stripe"],
            }
        },
    }
