from nion.telemetry.models import IncidentRecord
from nion.telemetry.store import TelemetryStore


def test_incident_store_records_and_filters_incidents(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_incident(
        IncidentRecord(
            incident_id="inc-1",
            source="chat",
            incident_type="task_timeout",
            severity="error",
            status="open",
            thread_id="thread-1",
            run_id="run-1",
            summary="Delegated task timed out before completion",
            user_visible_explanation="The last delegated task exceeded its timeout.",
            root_cause_hypothesis="The task stalled while waiting for a downstream step.",
            confidence=0.9,
            recommended_actions=[{"action_id": "a1", "label": "Inspect logs"}],
            executed_actions=[],
            evidence={"primary_error_event": "task_delegation_timed_out"},
        )
    )
    store.record_incident(
        IncidentRecord(
            incident_id="inc-2",
            source="chat",
            incident_type="thread_stream_failure",
            severity="error",
            status="dismissed",
            thread_id="thread-2",
            run_id="run-2",
            summary="Thread stream failed before producing a stable response",
            user_visible_explanation="The thread stream aborted unexpectedly.",
            root_cause_hypothesis="The stream encountered an upstream execution error.",
            confidence=0.7,
            recommended_actions=[],
            executed_actions=[],
            evidence={"primary_error_event": "thread_stream_failed"},
        )
    )

    task_incidents = store.list_incidents(limit=10, incident_type="task_timeout")
    dismissed_incidents = store.list_incidents(limit=10, status="dismissed")
    fetched = store.get_incident("inc-1")

    assert len(task_incidents) == 1
    assert task_incidents[0].incident_id == "inc-1"
    assert len(dismissed_incidents) == 1
    assert dismissed_incidents[0].incident_id == "inc-2"
    assert fetched.summary == "Delegated task timed out before completion"
    assert fetched.evidence["primary_error_event"] == "task_delegation_timed_out"


def test_incident_store_dismisses_incident(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_incident(
        IncidentRecord(
            incident_id="inc-3",
            source="chat",
            incident_type="subagent_failure",
            severity="error",
            status="open",
            thread_id="thread-3",
            run_id="run-3",
            summary="Subagent execution failed before returning a final result",
            user_visible_explanation="The delegated subagent ended with an error.",
            root_cause_hypothesis="The subagent hit an execution exception.",
            confidence=0.8,
            recommended_actions=[],
            executed_actions=[],
            evidence={"primary_error_event": "subagent_execution_failed"},
        )
    )

    store.dismiss_incident("inc-3")

    dismissed = store.get_incident("inc-3")

    assert dismissed.status == "dismissed"
