from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from nion.telemetry.models import DiagnosticSnapshot, EventRecord, IncidentRecord
from nion.telemetry.store import TelemetryStore

IncidentSource = Literal["chat", "desktop_button", "automatic"]
IncidentTypeHint = Literal["agent_execution", "daemon_runtime", "auto"]

_TASK_TIMEOUT_EVENT_TYPES = {
    "task_delegation_timed_out",
    "subagent_execution_timed_out",
}
_SUBAGENT_FAILURE_EVENT_TYPES = {
    "subagent_execution_failed",
}
_THREAD_FAILURE_EVENT_TYPES = {
    "thread_stream_failed",
}


def _safe_get_snapshot(
    store: TelemetryStore,
    scope_type: str,
    scope_id: str | None,
) -> DiagnosticSnapshot | None:
    if not scope_id:
        return None
    try:
        return store.get_snapshot(scope_type, scope_id)
    except LookupError:
        return None


def _find_primary_event(
    events: list[EventRecord],
    event_types: set[str],
) -> EventRecord | None:
    return next((event for event in events if event.event_type in event_types), None)


def _find_tool_failure_event(events: list[EventRecord]) -> EventRecord | None:
    for event in events:
        if event.level != "error":
            continue
        if event.event_type == "tool_execution_failed":
            return event
        if event.category == "tool" and event.tool_name:
            return event
        tool_name = event.details.get("tool_name")
        if isinstance(tool_name, str) and tool_name:
            return event
        reason = str(event.details.get("reason") or "")
        message = event.message
        haystack = f"{reason} {message}".lower()
        if "tool" in haystack and "fail" in haystack:
            return event
    return None


def _event_payload(event: EventRecord | None) -> dict[str, Any] | None:
    if event is None:
        return None
    return {
        "event_id": event.event_id,
        "timestamp": event.timestamp,
        "category": event.category,
        "level": event.level,
        "event_type": event.event_type,
        "message": event.message,
        "details": event.details,
    }


def _snapshot_payload(snapshot: DiagnosticSnapshot | None) -> dict[str, Any] | None:
    if snapshot is None:
        return None
    return {
        "scope_type": snapshot.scope_type,
        "scope_id": snapshot.scope_id,
        "status": snapshot.status,
        "summary": snapshot.summary,
        "updated_at": snapshot.updated_at,
        "details": snapshot.details,
    }


def _recommended_action(
    *,
    action_id: str,
    action_type: str,
    label: str,
    reason: str,
    scope: dict[str, str],
    tool_name: str,
    tool_args: dict[str, Any],
    expected_outcome: str,
) -> dict[str, Any]:
    return {
        "action_id": action_id,
        "action_type": action_type,
        "label": label,
        "reason": reason,
        "risk_level": "low",
        "requires_confirmation": True,
        "executable_now": True,
        "scope": scope,
        "execution_kind": "tool_call",
        "tool_name": tool_name,
        "tool_args": tool_args,
        "expected_outcome": expected_outcome,
    }


def _build_recommended_actions(
    incident_type: str,
    *,
    thread_id: str | None,
    run_id: str | None,
    include_recommended_actions: bool,
) -> list[dict[str, Any]]:
    if not include_recommended_actions:
        return []

    actions: list[dict[str, Any]] = []
    if run_id and incident_type in {"task_timeout", "subagent_failure"}:
        actions.append(
            _recommended_action(
                action_id="inspect-task",
                action_type="inspect_diagnostics",
                label="Inspect task diagnostics",
                reason="Review the latest task state before retrying anything.",
                scope={"run_id": run_id},
                tool_name="get_task_diagnostics",
                tool_args={"task_id": run_id},
                expected_outcome="Return the latest task diagnostic snapshot.",
            )
        )
        actions.append(
            _recommended_action(
                action_id="review-task-logs",
                action_type="review_logs",
                label="Review recent task logs",
                reason="Check the most recent task-scoped error events.",
                scope={"run_id": run_id},
                tool_name="get_recent_logs",
                tool_args={"run_id": run_id, "limit": 20},
                expected_outcome="Return the latest logs for this task.",
            )
        )
        return actions

    if thread_id:
        actions.append(
            _recommended_action(
                action_id="inspect-thread",
                action_type="inspect_diagnostics",
                label="Inspect thread diagnostics",
                reason="Review the latest thread state before deciding on follow-up work.",
                scope={"thread_id": thread_id},
                tool_name="get_thread_diagnostics",
                tool_args={"thread_id": thread_id},
                expected_outcome="Return the latest thread diagnostic snapshot.",
            )
        )
        actions.append(
            _recommended_action(
                action_id="review-thread-logs",
                action_type="review_logs",
                label="Review recent thread logs",
                reason="Check the most recent error events tied to this thread.",
                scope={"thread_id": thread_id},
                tool_name="get_recent_logs",
                tool_args={"thread_id": thread_id, "limit": 20},
                expected_outcome="Return the latest logs for this thread.",
            )
        )

    return actions


def _build_incident(
    *,
    source: IncidentSource,
    incident_type: str,
    severity: Literal["info", "warning", "error"],
    summary: str,
    explanation: str,
    root_cause_hypothesis: str,
    confidence: float,
    thread_id: str | None,
    run_id: str | None,
    evidence: dict[str, Any],
    recommended_actions: list[dict[str, Any]],
) -> IncidentRecord:
    return IncidentRecord(
        incident_id=str(uuid4()),
        source=source,
        incident_type=incident_type,
        severity=severity,
        status="open",
        summary=summary,
        user_visible_explanation=explanation,
        root_cause_hypothesis=root_cause_hypothesis,
        confidence=confidence,
        thread_id=thread_id,
        run_id=run_id,
        recommended_actions=recommended_actions,
        evidence=evidence,
    )


def diagnose_incident(
    *,
    store: TelemetryStore,
    source: IncidentSource,
    thread_id: str | None,
    run_id: str | None,
    incident_type_hint: IncidentTypeHint,
    include_recommended_actions: bool,
) -> IncidentRecord:
    if incident_type_hint == "daemon_runtime":
        return _build_incident(
            source=source,
            incident_type="daemon_runtime_degraded",
            severity="warning",
            summary="Daemon runtime diagnosis is not implemented in this phase",
            explanation="This phase only diagnoses agent-execution incidents. Daemon runtime incidents are designed but not implemented yet.",
            root_cause_hypothesis="Daemon runtime playbooks are deferred to a later phase.",
            confidence=0.3,
            thread_id=thread_id,
            run_id=run_id,
            evidence={"thread_id": thread_id, "run_id": run_id, "implemented": False},
            recommended_actions=[],
        )

    run_events = store.list_events(limit=20, run_id=run_id) if run_id else []
    thread_events = store.list_events(limit=20, thread_id=thread_id) if thread_id else []
    task_snapshot = _safe_get_snapshot(store, "task", run_id)
    thread_snapshot = _safe_get_snapshot(store, "thread", thread_id)
    runtime_snapshot = _safe_get_snapshot(store, "daemon", "local")

    timeout_event = _find_primary_event(run_events, _TASK_TIMEOUT_EVENT_TYPES)
    subagent_failure_event = _find_primary_event(run_events, _SUBAGENT_FAILURE_EVENT_TYPES)
    tool_failure_event = _find_tool_failure_event(thread_events)
    thread_failure_event = _find_primary_event(thread_events, _THREAD_FAILURE_EVENT_TYPES)

    task_status = str(task_snapshot.details.get("status")) if task_snapshot is not None else ""
    has_meaningful_failure_evidence = any(
        value is not None
        for value in (
            timeout_event,
            subagent_failure_event,
            tool_failure_event,
            thread_failure_event,
        )
    ) or (thread_snapshot is not None and thread_snapshot.status == "error")

    if not has_meaningful_failure_evidence:
        return _build_incident(
            source=source,
            incident_type="agent_execution_inconclusive",
            severity="info",
            summary="No conclusive agent-execution failure evidence was found",
            explanation="The current control-plane evidence does not show a clear task, subagent, tool, or thread-stream failure for this scope.",
            root_cause_hypothesis="More evidence is needed before classifying this as a real execution incident.",
            confidence=0.3,
            thread_id=thread_id,
            run_id=run_id,
            evidence={
                "thread_id": thread_id,
                "run_id": run_id,
                "diagnostic_scope": "agent_execution",
                "latest_task_snapshot": _snapshot_payload(task_snapshot),
                "latest_thread_snapshot": _snapshot_payload(thread_snapshot),
                "latest_runtime_summary": _snapshot_payload(runtime_snapshot),
                "relevant_events": [],
                "event_window": {
                    "run_events_considered": len(run_events),
                    "thread_events_considered": len(thread_events),
                    "limit": 20,
                },
                "primary_error_event": None,
                "confidence_signals": {
                    "has_task_snapshot": task_snapshot is not None,
                    "has_thread_snapshot": thread_snapshot is not None,
                    "has_primary_error_event": False,
                },
            },
            recommended_actions=[],
        )

    incident_type = "thread_stream_failure"
    primary_event = thread_failure_event or tool_failure_event or subagent_failure_event or timeout_event
    summary = "Thread stream failed before producing a stable response"
    explanation = "The thread stream ended before it produced a stable response."
    root_cause = "The failure occurred at the thread stream layer, but the exact downstream stage was not isolated."
    confidence = 0.65

    if timeout_event is not None or task_status == "timed_out":
        incident_type = "task_timeout"
        primary_event = timeout_event or subagent_failure_event or thread_failure_event
        summary = "Delegated task timed out before completion"
        explanation = "The latest delegated task did not complete within its allowed time window."
        root_cause = "The task likely stalled or exceeded its timeout before returning a final result."
        confidence = 0.9 if timeout_event and task_snapshot else 0.8
    elif subagent_failure_event is not None or (
        task_snapshot is not None
        and task_status == "failed"
        and task_snapshot.details.get("subagent_name")
    ):
        incident_type = "subagent_failure"
        primary_event = subagent_failure_event or thread_failure_event
        subagent_name = task_snapshot.details.get("subagent_name") if task_snapshot else None
        summary = "Subagent execution failed before returning a final result"
        explanation = (
            f"The delegated subagent '{subagent_name}' failed before it could return a stable final result."
            if subagent_name
            else "The delegated subagent failed before it could return a stable final result."
        )
        root_cause = "The delegated execution path encountered an exception after it started running."
        confidence = 0.9 if subagent_failure_event and task_snapshot else 0.8
    elif tool_failure_event is not None:
        incident_type = "tool_execution_failure"
        primary_event = tool_failure_event
        reason = str(tool_failure_event.details.get("reason") or tool_failure_event.message)
        summary = "Tool execution failed and interrupted the run"
        explanation = "A tool failure appears to be the most likely cause of the run interruption."
        root_cause = reason[:300]
        confidence = 0.7
    elif thread_failure_event is not None or (thread_snapshot is not None and thread_snapshot.status == "error"):
        incident_type = "thread_stream_failure"
        primary_event = thread_failure_event
        summary = "Thread stream failed before producing a stable response"
        explanation = "The thread stream failed before it could produce a stable final response."
        root_cause = (
            str(thread_failure_event.details.get("reason") or thread_failure_event.message)
            if thread_failure_event is not None
            else thread_snapshot.summary
        )
        confidence = 0.75 if thread_failure_event and thread_snapshot else 0.65

    evidence = {
        "thread_id": thread_id,
        "run_id": run_id,
        "diagnostic_scope": "agent_execution",
        "latest_task_snapshot": _snapshot_payload(task_snapshot),
        "latest_thread_snapshot": _snapshot_payload(thread_snapshot),
        "latest_runtime_summary": _snapshot_payload(runtime_snapshot),
        "relevant_events": [
            payload
            for payload in (
                _event_payload(primary_event),
                *[_event_payload(event) for event in run_events[:5] if event is not primary_event],
                *[_event_payload(event) for event in thread_events[:5] if event is not primary_event],
            )
            if payload is not None
        ][:10],
        "event_window": {
            "run_events_considered": len(run_events),
            "thread_events_considered": len(thread_events),
            "limit": 20,
        },
        "primary_error_event": _event_payload(primary_event),
        "confidence_signals": {
            "has_task_snapshot": task_snapshot is not None,
            "has_thread_snapshot": thread_snapshot is not None,
            "has_primary_error_event": primary_event is not None,
        },
    }

    actions = _build_recommended_actions(
        incident_type,
        thread_id=thread_id,
        run_id=run_id,
        include_recommended_actions=include_recommended_actions,
    )

    return _build_incident(
        source=source,
        incident_type=incident_type,
        severity="error",
        summary=summary,
        explanation=explanation,
        root_cause_hypothesis=root_cause,
        confidence=confidence,
        thread_id=thread_id,
        run_id=run_id,
        evidence=evidence,
        recommended_actions=actions,
    )
