import json

import httpx

from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config
from nion.config.paths import get_paths
from nion.telemetry.models import DiagnosticSnapshot, EventRecord
from nion.telemetry.store import TelemetryStore
from nion.tools.builtins.control_plane_tools import (
    approve_channel_pair_request_tool,
    diagnose_incident_tool,
    dismiss_incident_tool,
    get_channel_diagnostics_tool,
    get_channels_status_tool,
    get_incident_tool,
    get_recent_logs_tool,
    get_runtime_status_tool,
    get_task_diagnostics_tool,
    issue_channel_pairing_code_tool,
    list_channel_authorized_users_tool,
    list_channel_pair_requests_tool,
    list_incidents_tool,
    reject_channel_pair_request_tool,
    restart_channel_control_plane_tool,
    revoke_channel_authorized_user_tool,
    run_doctor_tool,
    update_config_tool,
)


def test_runtime_status_tool_returns_control_plane_summary(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    reset_app_config()
    result = get_runtime_status_tool.invoke({})
    payload = json.loads(result)
    assert payload["status"] == "healthy"
    assert "Daemon control plane available" in payload["summary"]


def test_recent_logs_tool_returns_json(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    store = TelemetryStore(get_paths().telemetry_db_file)
    store.record_event(
        EventRecord(
            event_id="evt-1",
            category="tool",
            level="info",
            event_type="task_delegation_started",
            actor="agent",
            run_id="task-123",
            tool_name="task",
            message="Delegated task 'inspect logs' started",
            details={},
        )
    )
    result = get_recent_logs_tool.invoke({"limit": 5, "run_id": "task-123"})
    payload = json.loads(result)
    assert isinstance(payload, list)
    assert payload[0]["run_id"] == "task-123"


def test_get_task_diagnostics_tool_returns_snapshot(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    store = TelemetryStore(get_paths().telemetry_db_file)
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="task",
            scope_id="task-123",
            status="error",
            summary="Delegated task 'inspect logs' failed",
            details={
                "task_id": "task-123",
                "status": "failed",
                "latest_tool_summary": "Delegated and tracked subtasks",
                "tool_activity_timeline": [
                    {
                        "summary_label": "Delegated and tracked subtasks",
                        "activity_label": "Subtask failed",
                    }
                ],
            },
        )
    )

    result = get_task_diagnostics_tool.invoke({"task_id": "task-123"})
    payload = json.loads(result)

    assert payload["status"] == "error"
    assert payload["details"]["task_id"] == "task-123"
    assert payload["details"]["latest_tool_summary"] == "Delegated and tracked subtasks"
    assert payload["details"]["tool_activity_timeline"][0]["activity_label"] == "Subtask failed"


def test_get_thread_diagnostics_tool_includes_tool_activity_timeline_in_fallback(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    store = TelemetryStore(get_paths().telemetry_db_file)
    store.record_event(
        EventRecord(
            event_id="evt-thread-1",
            category="thread",
            level="info",
            event_type="thread_stream_finished",
            actor="agent",
            thread_id="thread-1",
            message="Thread stream finished",
            details={
                "latest_tool_summary": "Inspected project files",
                "latest_tool_activity": "Completed tool batch",
            },
        )
    )

    result = get_thread_diagnostics_tool.invoke({"thread_id": "thread-1"})
    payload = json.loads(result)

    assert payload["details"]["tool_activity_timeline"][0]["summary_label"] == "Inspected project files"


def test_run_doctor_tool_returns_summary(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    reset_app_config()
    result = run_doctor_tool.invoke({})
    payload = json.loads(result)
    assert payload["status"] == "healthy"


def test_update_config_tool_updates_daemon_section(monkeypatch, tmp_path):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    extensions_path.write_text('{"mcpServers": {}, "skills": {}}', encoding="utf-8")
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    reset_app_config()
    reset_extensions_config()

    result = update_config_tool.invoke({"daemon_config": {"allow_background_running": True}})
    payload = json.loads(result)

    assert payload["ok"] is True


def test_diagnose_incident_tool_returns_daemon_incident(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_post(path: str, *, payload=None):
        assert path == "/api/daemon/incidents/diagnose"
        assert payload == {
            "source": "chat",
            "thread_id": "thread-1",
            "run_id": "run-1",
            "incident_type_hint": "agent_execution",
            "include_recommended_actions": True,
        }
        return {
            "incident_id": "inc-1",
            "source": "chat",
            "incident_type": "task_timeout",
            "severity": "error",
            "status": "open",
            "summary": "Delegated task timed out before completion",
            "user_visible_explanation": "The latest delegated task did not finish in time.",
            "thread_id": "thread-1",
            "run_id": "run-1",
            "recommended_actions": [{"action_id": "inspect-task"}],
            "executed_actions": [],
            "evidence": {"primary_error_event": "task_delegation_timed_out"},
        }

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_post", fake_post)
    payload = json.loads(
        diagnose_incident_tool.invoke(
            {
                "source": "chat",
                "thread_id": "thread-1",
                "run_id": "run-1",
                "incident_type_hint": "agent_execution",
                "include_recommended_actions": True,
            }
        )
    )
    assert payload["incident_type"] == "task_timeout"
    assert payload["incident_id"] == "inc-1"


def test_list_incidents_tool_returns_filtered_results(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_get(path: str, *, params=None):
        assert path == "/api/daemon/incidents"
        assert params == {"status": "open", "limit": 10}
        return {
            "incidents": [
                {
                    "incident_id": "inc-open",
                    "source": "chat",
                    "incident_type": "task_timeout",
                    "severity": "error",
                    "status": "open",
                    "summary": "Delegated task timed out before completion",
                    "user_visible_explanation": "The latest delegated task did not finish in time.",
                    "thread_id": "thread-1",
                    "run_id": "run-1",
                    "recommended_actions": [],
                    "executed_actions": [],
                    "evidence": {},
                }
            ]
        }

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_get", fake_get)
    payload = json.loads(list_incidents_tool.invoke({"status": "open", "limit": 10}))
    assert payload["incidents"][0]["incident_id"] == "inc-open"


def test_get_incident_tool_returns_incident(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_get(path: str, *, params=None):
        assert path == "/api/daemon/incidents/inc-1"
        assert params is None
        return {
            "incident_id": "inc-1",
            "source": "chat",
            "incident_type": "subagent_failure",
            "severity": "error",
            "status": "open",
            "summary": "Subagent execution failed before returning a final result",
            "user_visible_explanation": "The subagent ended with an error.",
            "thread_id": "thread-2",
            "run_id": "run-2",
            "recommended_actions": [],
            "executed_actions": [],
            "evidence": {},
        }

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_get", fake_get)
    payload = json.loads(get_incident_tool.invoke({"incident_id": "inc-1"}))
    assert payload["incident_id"] == "inc-1"
    assert payload["incident_type"] == "subagent_failure"


def test_dismiss_incident_tool_returns_dismissed_record(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_post(path: str, *, payload=None):
        assert path == "/api/daemon/incidents/inc-dismiss/dismiss"
        assert payload is None
        return {
            "incident_id": "inc-dismiss",
            "source": "chat",
            "incident_type": "tool_execution_failure",
            "severity": "error",
            "status": "dismissed",
            "summary": "Tool execution failed and interrupted the run",
            "user_visible_explanation": "A tool failed during execution.",
            "thread_id": "thread-3",
            "run_id": "run-3",
            "recommended_actions": [],
            "executed_actions": [],
            "evidence": {},
        }

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_post", fake_post)
    payload = json.loads(dismiss_incident_tool.invoke({"incident_id": "inc-dismiss"}))
    assert payload["status"] == "dismissed"


def test_get_incident_tool_returns_http_error_payload(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    request = httpx.Request("GET", "http://127.0.0.1:43115/api/daemon/incidents/inc-missing")
    response = httpx.Response(404, request=request)

    def fake_get(path: str, *, params=None):
        assert path == "/api/daemon/incidents/inc-missing"
        raise httpx.HTTPStatusError("404 Not Found", request=request, response=response)

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_get", fake_get)
    payload = json.loads(get_incident_tool.invoke({"incident_id": "inc-missing"}))
    assert payload["error_type"] == "HTTPStatusError"
    assert "404 Not Found" in payload["error"]


def test_get_channels_status_tool_returns_daemon_status(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_get(path: str, *, params=None):
        assert path == "/api/daemon/channels"
        assert params is None
        return {
            "service_running": True,
            "pending_pair_requests": 1,
            "channels": {
                "feishu": {
                    "enabled": True,
                    "running": True,
                    "capabilities": {"supports_streaming": True},
                    "last_heartbeat": 123.0,
                    "last_error": None,
                    "authorized_user_count": 2,
                    "pending_pair_request_count": 1,
                    "can_restart": True,
                }
            },
        }

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_get", fake_get)
    payload = json.loads(get_channels_status_tool.invoke({}))
    assert payload["service_running"] is True
    assert payload["channels"]["feishu"]["running"] is True


def test_get_channel_diagnostics_tool_returns_payload(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_get(path: str, *, params=None):
        assert path == "/api/daemon/channels/feishu"
        assert params is None
        return {
            "status": "error",
            "summary": "Channel 'feishu' outbound delivery failed",
            "details": {"channel_name": "feishu"},
        }

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_get", fake_get)
    payload = json.loads(get_channel_diagnostics_tool.invoke({"channel_name": "feishu"}))
    assert payload["status"] == "error"
    assert payload["details"]["channel_name"] == "feishu"


def test_list_channel_pair_requests_tool_returns_seeded_requests(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_get(path: str, *, params=None):
        assert path == "/api/daemon/channels/lark/pair-requests"
        assert params == {"status": "pending"}
        return [
            {
                "id": 1,
                "platform": "lark",
                "code": "654321",
                "external_user_id": "ou_seeded",
                "external_user_name": "Seeded User",
                "chat_id": "oc_seeded",
                "conversation_type": "group",
                "source_event_id": "evt_seeded",
                "status": "pending",
                "note": None,
                "created_at": "2026-03-26T00:00:00+00:00",
                "handled_at": None,
                "handled_by": None,
            }
        ]

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_get", fake_get)
    payload = json.loads(
        list_channel_pair_requests_tool.invoke({"platform": "lark", "status": "pending"})
    )
    assert payload[0]["status"] == "pending"


def test_list_channel_authorized_users_tool_returns_seeded_users(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_get(path: str, *, params=None):
        assert path == "/api/daemon/channels/lark/authorized-users"
        assert params == {"active_only": True}
        return [
            {
                "id": 1,
                "platform": "lark",
                "external_user_id": "ou_seeded",
                "external_user_name": "Seeded User",
                "chat_id": "oc_seeded",
                "conversation_type": "group",
                "workspace_id": "default",
                "session_override": None,
                "granted_at": "2026-03-26T00:00:00+00:00",
                "revoked_at": None,
                "source_request_id": 1,
            }
        ]

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_get", fake_get)
    payload = json.loads(
        list_channel_authorized_users_tool.invoke({"platform": "lark", "active_only": True})
    )
    assert payload[0]["workspace_id"] == "default"


def test_restart_channel_control_plane_tool_returns_action_result(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_post(path: str, *, payload=None):
        assert path == "/api/daemon/channels/feishu/restart"
        assert payload is None
        return {"success": True, "message": "Channel feishu restarted successfully"}

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_post", fake_post)
    payload = json.loads(restart_channel_control_plane_tool.invoke({"channel_name": "feishu"}))
    assert payload["success"] is True


def test_issue_channel_pairing_code_tool_returns_pairing_code(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_post(path: str, *, payload=None):
        assert path == "/api/daemon/channels/lark/pairing-code"
        assert payload == {"ttl_minutes": 15}
        return {
            "id": 1,
            "platform": "lark",
            "code": "654321",
            "expires_at": "2026-03-26T00:15:00+00:00",
            "consumed_at": None,
            "created_at": "2026-03-26T00:00:00+00:00",
        }

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_post", fake_post)
    payload = json.loads(
        issue_channel_pairing_code_tool.invoke({"platform": "lark", "ttl_minutes": 15})
    )
    assert payload["platform"] == "lark"


def test_approve_channel_pair_request_tool_returns_request(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_post(path: str, *, payload=None):
        assert path == "/api/daemon/channels/lark/pair-requests/1/approve"
        assert payload == {"handled_by": "daemon", "workspace_id": "default", "note": None}
        return {
            "id": 1,
            "platform": "lark",
            "code": "654321",
            "external_user_id": "ou_seeded",
            "external_user_name": "Seeded User",
            "chat_id": "oc_seeded",
            "conversation_type": "group",
            "source_event_id": "evt_seeded",
            "status": "approved",
            "note": None,
            "created_at": "2026-03-26T00:00:00+00:00",
            "handled_at": "2026-03-26T00:01:00+00:00",
            "handled_by": "daemon",
        }

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_post", fake_post)
    payload = json.loads(
        approve_channel_pair_request_tool.invoke(
            {"platform": "lark", "request_id": 1, "handled_by": "daemon", "workspace_id": "default"}
        )
    )
    assert payload["status"] == "approved"


def test_reject_channel_pair_request_tool_returns_request(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_post(path: str, *, payload=None):
        assert path == "/api/daemon/channels/lark/pair-requests/1/reject"
        assert payload == {"handled_by": "daemon", "workspace_id": None, "note": "denied"}
        return {
            "id": 1,
            "platform": "lark",
            "code": "654321",
            "external_user_id": "ou_seeded",
            "external_user_name": "Seeded User",
            "chat_id": "oc_seeded",
            "conversation_type": "group",
            "source_event_id": "evt_seeded",
            "status": "rejected",
            "note": "denied",
            "created_at": "2026-03-26T00:00:00+00:00",
            "handled_at": "2026-03-26T00:01:00+00:00",
            "handled_by": "daemon",
        }

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_post", fake_post)
    payload = json.loads(
        reject_channel_pair_request_tool.invoke(
            {"platform": "lark", "request_id": 1, "handled_by": "daemon", "note": "denied"}
        )
    )
    assert payload["status"] == "rejected"


def test_revoke_channel_authorized_user_tool_returns_result(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    def fake_post(path: str, *, payload=None):
        assert path == "/api/daemon/channels/lark/authorized-users/1/revoke"
        assert payload == {"handled_by": "daemon"}
        return {"revoked": True}

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_post", fake_post)
    payload = json.loads(
        revoke_channel_authorized_user_tool.invoke(
            {"platform": "lark", "user_id": 1, "handled_by": "daemon"}
        )
    )
    assert payload["revoked"] is True


def test_get_channels_status_tool_returns_http_error_payload(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    request = httpx.Request("GET", "http://127.0.0.1:43115/api/daemon/channels")
    response = httpx.Response(503, request=request)

    def fake_get(path: str, *, params=None):
        assert path == "/api/daemon/channels"
        raise httpx.HTTPStatusError("503 Service Unavailable", request=request, response=response)

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_get", fake_get)
    payload = json.loads(get_channels_status_tool.invoke({}))
    assert payload["error_type"] == "HTTPStatusError"
    assert "503 Service Unavailable" in payload["error"]


def test_restart_channel_control_plane_tool_returns_connect_error_payload(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    request = httpx.Request("POST", "http://127.0.0.1:43115/api/daemon/channels/feishu/restart")

    def fake_post(path: str, *, payload=None):
        assert path == "/api/daemon/channels/feishu/restart"
        raise httpx.ConnectError("Connection refused", request=request)

    monkeypatch.setattr("nion.tools.builtins.control_plane_tools._daemon_post", fake_post)
    result = json.loads(restart_channel_control_plane_tool.invoke({"channel_name": "feishu"}))
    assert result["error_type"] == "ConnectError"
    assert "Connection refused" in result["error"]
