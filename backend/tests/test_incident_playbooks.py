from nion.incidents.playbooks import diagnose_incident
from nion.telemetry.models import DiagnosticSnapshot, EventRecord
from nion.telemetry.store import TelemetryStore


def test_diagnose_task_timeout_incident(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        EventRecord(
            event_id="evt-timeout",
            category="tool",
            level="warning",
            event_type="task_delegation_timed_out",
            actor="agent",
            message="Delegated task 'inspect logs' timed out",
            run_id="run-timeout",
            tool_name="task",
            details={"description": "inspect logs"},
        )
    )
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="task",
            scope_id="run-timeout",
            status="error",
            summary="Delegated task 'inspect logs' timed out",
            details={"status": "timed_out", "description": "inspect logs"},
        )
    )

    incident = diagnose_incident(
        store=store,
        source="chat",
        thread_id="thread-1",
        run_id="run-timeout",
        incident_type_hint="agent_execution",
        include_recommended_actions=True,
    )

    assert incident.incident_type == "task_timeout"
    assert incident.severity == "error"
    assert incident.summary
    assert incident.evidence["primary_error_event"]["event_type"] == "task_delegation_timed_out"
    assert len(incident.recommended_actions) <= 2
    assert incident.recommended_actions[0]["tool_name"] == "get_task_diagnostics"


def test_diagnose_subagent_failure_incident(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        EventRecord(
            event_id="evt-subagent-failed",
            category="agent",
            level="error",
            event_type="subagent_execution_failed",
            actor="agent",
            message="Subagent 'general-purpose' failed",
            run_id="run-subagent",
            details={"subagent_name": "general-purpose", "error": "boom"},
        )
    )
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="task",
            scope_id="run-subagent",
            status="error",
            summary="Subagent 'general-purpose' failed",
            details={"status": "failed", "subagent_name": "general-purpose"},
        )
    )

    incident = diagnose_incident(
        store=store,
        source="chat",
        thread_id="thread-2",
        run_id="run-subagent",
        incident_type_hint="agent_execution",
        include_recommended_actions=True,
    )

    assert incident.incident_type == "subagent_failure"
    assert incident.severity == "error"
    assert incident.summary
    assert incident.evidence["primary_error_event"]["event_type"] == "subagent_execution_failed"
    assert len(incident.recommended_actions) <= 2


def test_diagnose_tool_execution_failure_incident(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        EventRecord(
            event_id="evt-thread-failed",
            category="thread",
            level="error",
            event_type="thread_stream_failed",
            actor="system",
            message="Thread stream failed for thread-3",
            thread_id="thread-3",
            details={"reason": "Tool 'bash' failed with RuntimeError: command exited 1"},
        )
    )

    incident = diagnose_incident(
        store=store,
        source="chat",
        thread_id="thread-3",
        run_id=None,
        incident_type_hint="agent_execution",
        include_recommended_actions=True,
    )

    assert incident.incident_type == "tool_execution_failure"
    assert incident.severity == "error"
    assert incident.summary
    assert incident.evidence["primary_error_event"]["event_type"] == "thread_stream_failed"
    assert len(incident.recommended_actions) <= 2
    assert incident.recommended_actions[0]["tool_name"] == "get_thread_diagnostics"


def test_diagnose_thread_stream_failure_incident(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        EventRecord(
            event_id="evt-thread-stream-failed",
            category="thread",
            level="error",
            event_type="thread_stream_failed",
            actor="system",
            message="Thread stream failed for thread-4",
            thread_id="thread-4",
            details={"reason": "upstream unavailable"},
        )
    )
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="thread",
            scope_id="thread-4",
            status="error",
            summary="Thread stream failed for thread-4",
            details={"surface": "workspace"},
        )
    )

    incident = diagnose_incident(
        store=store,
        source="chat",
        thread_id="thread-4",
        run_id=None,
        incident_type_hint="agent_execution",
        include_recommended_actions=True,
    )

    assert incident.incident_type == "thread_stream_failure"
    assert incident.severity == "error"
    assert incident.summary
    assert incident.evidence["primary_error_event"]["event_type"] == "thread_stream_failed"
    assert len(incident.recommended_actions) <= 2


def test_diagnose_incident_returns_inconclusive_when_no_failure_evidence(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")

    incident = diagnose_incident(
        store=store,
        source="chat",
        thread_id="thread-empty",
        run_id="run-empty",
        incident_type_hint="agent_execution",
        include_recommended_actions=True,
    )

    assert incident.incident_type == "agent_execution_inconclusive"
    assert incident.severity == "info"
    assert incident.summary
    assert incident.evidence["primary_error_event"] is None
    assert incident.recommended_actions == []


def test_diagnose_thread_stream_failure_does_not_misclassify_without_structured_tool_signal(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        EventRecord(
            event_id="evt-thread-generic-fail",
            category="thread",
            level="error",
            event_type="thread_stream_failed",
            actor="system",
            message="Thread stream failed for thread-5",
            thread_id="thread-5",
            details={"reason": "upstream unavailable"},
        )
    )

    incident = diagnose_incident(
        store=store,
        source="chat",
        thread_id="thread-5",
        run_id=None,
        incident_type_hint="agent_execution",
        include_recommended_actions=True,
    )

    assert incident.incident_type == "thread_stream_failure"
    assert incident.severity == "error"
