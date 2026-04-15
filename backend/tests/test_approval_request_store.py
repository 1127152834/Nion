from __future__ import annotations

import json

from nion.thread_permissions import (
    consume_thread_pending_allow,
    create_thread_approval_request,
    create_thread_permission_request,
    get_thread_approval_request,
    get_thread_permission_profile,
    resolve_thread_approval_request,
)


def test_tool_permission_approval_roundtrips_and_preserves_pending_allow(
    tmp_path,
    monkeypatch,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_approval_request(
        thread_id="thread-tool",
        approval_kind="tool_permission",
        tool_name="bash",
        tool_input={"command": "echo hi"},
        original_message_text="run bash",
    )
    resolved = resolve_thread_approval_request(
        thread_id="thread-tool",
        approval_request_id=request.id,
        decision="allow",
    )

    assert resolved is not None
    assert resolved.approval_kind == "tool_permission"
    assert resolved.status == "allow"
    assert (
        consume_thread_pending_allow(
            thread_id="thread-tool",
            tool_name="bash",
            tool_input={"command": "echo hi"},
        )
        is True
    )


def test_local_action_plan_approval_does_not_create_pending_allow_or_session_profile(
    tmp_path,
    monkeypatch,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_approval_request(
        thread_id="thread-local-actions",
        approval_kind="local_action_plan",
        local_action_payload={
            "execution_id": "exec-1",
            "plan_id": "plan-1",
            "actions": [
                {"action_type": "capture_active_window", "target": "active_window"}
            ],
        },
        original_message_text="帮我截图",
    )
    resolved = resolve_thread_approval_request(
        thread_id="thread-local-actions",
        approval_request_id=request.id,
        decision="allow_session",
    )

    assert resolved is not None
    assert resolved.approval_kind == "local_action_plan"
    assert resolved.status == "allow"
    assert get_thread_permission_profile("thread-local-actions") == "default"
    assert (
        consume_thread_pending_allow(
            thread_id="thread-local-actions",
            tool_name="local_actions_review",
            tool_input={"execution_id": "exec-1"},
        )
        is False
    )


def test_legacy_permission_request_records_read_as_tool_permission(
    tmp_path,
    monkeypatch,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))
    store_path = tmp_path / "nion-home" / "thread_permissions.json"
    store_path.parent.mkdir(parents=True)
    store_path.write_text(
        json.dumps(
            {
                "requests": [
                    {
                        "id": "perm-legacy",
                        "thread_id": "thread-legacy",
                        "tool_name": "bash",
                        "tool_input": {"command": "echo hi"},
                        "original_message_text": "run bash",
                        "replay_payload": {
                            "text": "run bash",
                            "files": [],
                            "additional_kwargs": {},
                        },
                        "status": "pending",
                        "created_at": "2026-04-16T00:00:00Z",
                        "resolved_at": None,
                        "consumed": False,
                    }
                ],
                "thread_profiles": {},
                "pending_allows": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    loaded = get_thread_approval_request(
        thread_id="thread-legacy",
        approval_request_id="perm-legacy",
    )

    assert loaded is not None
    assert loaded.approval_kind == "tool_permission"
    assert loaded.tool_name == "bash"


def test_legacy_create_thread_permission_request_sets_tool_permission_kind(
    tmp_path,
    monkeypatch,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_permission_request(
        thread_id="thread-wrapper",
        tool_name="bash",
        tool_input={"command": "pwd"},
        original_message_text="pwd",
    )
    loaded = get_thread_approval_request(
        thread_id="thread-wrapper",
        approval_request_id=request.id,
    )

    assert loaded is not None
    assert loaded.approval_kind == "tool_permission"
