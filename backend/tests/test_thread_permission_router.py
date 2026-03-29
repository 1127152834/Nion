from __future__ import annotations

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.thread_permissions import create_thread_permission_request
from nion.threads.repository import ThreadRepository


def test_workspace_permission_resolve_route_retries_original_message(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))
    repository = ThreadRepository(base_dir=tmp_path / "nion-home")
    repository.upsert_thread("thread-1", values={"messages": [], "artifacts": []})

    request = create_thread_permission_request(
        thread_id="thread-1",
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

    with TestClient(create_app()) as client:
        response = client.post(
            f"/api/threads/thread-1/permissions/{request.id}/resolve",
            json={"decision": "allow"},
        )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["consumed"] is True
    assert response.json()["replay_payload"] == {
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
    assert response.json()["original_message_text"] == "帮我安装 stripe CLI"
    assert response.json()["tool_name"] == "codepilot_cli_tools_install"
    updated = repository.get_thread("thread-1")
    assert updated is not None
    assert updated.values.resolved_permission_request_ids == [request.id]


def test_workspace_permission_second_allow_is_not_retried(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))
    repository = ThreadRepository(base_dir=tmp_path / "nion-home")
    repository.upsert_thread("thread-2", values={"messages": [], "artifacts": []})

    request = create_thread_permission_request(
        thread_id="thread-2",
        tool_name="codepilot_cli_tools_install",
        tool_input={"command": "brew install stripe/stripe-cli/stripe"},
        original_message_text="帮我安装 stripe CLI",
    )

    with TestClient(create_app()) as client:
        first = client.post(
            f"/api/threads/thread-2/permissions/{request.id}/resolve",
            json={"decision": "allow"},
        )
        second = client.post(
            f"/api/threads/thread-2/permissions/{request.id}/resolve",
            json={"decision": "allow"},
        )

    assert first.status_code == 200
    assert first.json()["consumed"] is True
    assert second.status_code == 200
    assert second.json()["consumed"] is False
    updated = repository.get_thread("thread-2")
    assert updated is not None
    assert updated.values.resolved_permission_request_ids == [request.id]


def test_workspace_permission_resolve_rejects_bridge_thread(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))
    repository = ThreadRepository(base_dir=tmp_path / "nion-home")
    repository.upsert_thread(
        "thread-bridge",
        values={
            "messages": [],
            "artifacts": [],
            "bridge": {
                "source": "bridge",
                "platform": "telegram",
                "chatId": "123",
            },
        },
    )

    request = create_thread_permission_request(
        thread_id="thread-bridge",
        tool_name="bash",
        tool_input={"command": "echo hi"},
        original_message_text="run bash",
    )

    with TestClient(create_app()) as client:
        response = client.post(
            f"/api/threads/thread-bridge/permissions/{request.id}/resolve",
            json={"decision": "allow"},
        )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Bridge permission requests must use the bridge resolve route",
    }


def test_bridge_permission_resolve_rejects_non_bridge_thread(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))
    repository = ThreadRepository(base_dir=tmp_path / "nion-home")
    repository.upsert_thread(
        "thread-workspace",
        values={"messages": [], "artifacts": []},
    )

    request = create_thread_permission_request(
        thread_id="thread-workspace",
        tool_name="bash",
        tool_input={"command": "echo hi"},
        original_message_text="run bash",
    )

    with TestClient(create_app()) as client:
        response = client.post(
            f"/api/threads/thread-workspace/bridge/permissions/{request.id}/resolve",
            json={"decision": "allow"},
        )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Workspace permission requests must use the workspace resolve route",
    }
