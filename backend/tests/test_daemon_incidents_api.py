from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config import paths as paths_module
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config
from nion.config.paths import get_paths
from nion.telemetry.models import DiagnosticSnapshot, EventRecord, IncidentRecord
from nion.telemetry.store import TelemetryStore


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _configure_test_env(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    nion_home = tmp_path / "nion-home"
    _write_extensions_config(extensions_path)

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_HOME", str(nion_home))
    paths_module._paths = None
    reset_app_config()
    reset_extensions_config()


def _stub_daemon_channel_lifecycle(monkeypatch) -> None:
    async def fake_start_channel_service():
        return None

    async def fake_stop_channel_service() -> None:
        return None

    monkeypatch.setattr("app.daemon.app.start_channel_service", fake_start_channel_service)
    monkeypatch.setattr("app.daemon.app.stop_channel_service", fake_stop_channel_service)


def test_daemon_incidents_diagnose_creates_agent_execution_incident(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)

    try:
        store = TelemetryStore(get_paths().telemetry_db_file)
        store.record_event(
            EventRecord(
                event_id="evt-timeout",
                category="tool",
                level="warning",
                event_type="task_delegation_timed_out",
                actor="agent",
                message="Delegated task 'inspect logs' timed out",
                run_id="run-1",
                tool_name="task",
                details={"description": "inspect logs"},
            )
        )
        store.upsert_snapshot(
            DiagnosticSnapshot(
                scope_type="task",
                scope_id="run-1",
                status="error",
                summary="Delegated task 'inspect logs' timed out",
                details={"status": "timed_out", "description": "inspect logs"},
            )
        )

        with TestClient(create_app()) as client:
            response = client.post(
                "/api/daemon/incidents/diagnose",
                json={
                    "source": "chat",
                    "thread_id": "thread-1",
                    "run_id": "run-1",
                    "incident_type_hint": "agent_execution",
                    "include_recommended_actions": True,
                },
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["source"] == "chat"
        assert payload["incident_type"] == "task_timeout"
        assert payload["thread_id"] == "thread-1"
        assert payload["run_id"] == "run-1"
        assert payload["severity"] == "error"
        assert payload["status"] == "open"
        assert payload["incident_id"]
        assert payload["recommended_actions"]

        store = TelemetryStore(get_paths().telemetry_db_file)
        incident = store.get_incident(payload["incident_id"])
        assert incident.incident_type == "task_timeout"
        assert incident.thread_id == "thread-1"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_incidents_list_returns_filtered_results(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)

    try:
        store = TelemetryStore(get_paths().telemetry_db_file)
        store.record_incident(
            IncidentRecord(
                incident_id="inc-open",
                source="chat",
                incident_type="task_timeout",
                severity="error",
                status="open",
                thread_id="thread-1",
                run_id="run-1",
                summary="Delegated task timed out before completion",
                user_visible_explanation="The last delegated task exceeded its timeout.",
            )
        )
        store.record_incident(
            IncidentRecord(
                incident_id="inc-dismissed",
                source="chat",
                incident_type="thread_stream_failure",
                severity="error",
                status="dismissed",
                thread_id="thread-2",
                run_id="run-2",
                summary="Thread stream failed before producing a stable response",
                user_visible_explanation="The thread stream aborted unexpectedly.",
            )
        )

        with TestClient(create_app()) as client:
            response = client.get("/api/daemon/incidents", params={"status": "open"})

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["incidents"]) == 1
        assert payload["incidents"][0]["incident_id"] == "inc-open"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_incident_detail_returns_record(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)

    try:
        store = TelemetryStore(get_paths().telemetry_db_file)
        store.record_incident(
            IncidentRecord(
                incident_id="inc-detail",
                source="chat",
                incident_type="subagent_failure",
                severity="error",
                status="open",
                thread_id="thread-3",
                run_id="run-3",
                summary="Subagent execution failed before returning a final result",
                user_visible_explanation="The delegated subagent ended with an error.",
            )
        )

        with TestClient(create_app()) as client:
            response = client.get("/api/daemon/incidents/inc-detail")

        assert response.status_code == 200
        payload = response.json()
        assert payload["incident_id"] == "inc-detail"
        assert payload["incident_type"] == "subagent_failure"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_incident_dismiss_marks_record(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)

    try:
        store = TelemetryStore(get_paths().telemetry_db_file)
        store.record_incident(
            IncidentRecord(
                incident_id="inc-dismiss",
                source="chat",
                incident_type="tool_execution_failure",
                severity="error",
                status="open",
                thread_id="thread-4",
                run_id="run-4",
                summary="Tool execution failed and interrupted the run",
                user_visible_explanation="A tool failed during execution.",
            )
        )

        with TestClient(create_app()) as client:
            response = client.post("/api/daemon/incidents/inc-dismiss/dismiss")

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "dismissed"

        incident = store.get_incident("inc-dismiss")
        assert incident.status == "dismissed"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()
