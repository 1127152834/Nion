from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.routers import automation as automation_router
from nion.automation.models import AutomationRun
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService
from nion.telemetry.logger import make_event
from nion.telemetry.store import TelemetryStore


def test_list_automation_events_returns_recent_records(tmp_path):
    app = FastAPI()
    app.include_router(automation_router.router)
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        make_event(
            category="thread",
            level="info",
            event_type="thread_stream_finished",
            actor="system",
            thread_id="thread-1",
            message="Thread finished",
            details={"surface": "workspace"},
        )
    )

    with TestClient(app) as client:
        app.dependency_overrides[automation_router.get_telemetry_store] = lambda: store
        response = client.get("/api/automation/events")

    assert response.status_code == 200
    payload = response.json()
    assert payload["events"][0]["event_type"] == "thread_stream_finished"


def test_list_automation_events_filters_by_category_and_event_type(tmp_path):
    app = FastAPI()
    app.include_router(automation_router.router)
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        make_event(
            category="thread",
            level="info",
            event_type="thread_stream_finished",
            actor="system",
            thread_id="thread-1",
            message="Thread finished",
            details={},
        )
    )
    store.record_event(
        make_event(
            category="agent",
            level="error",
            event_type="agent_run_failed",
            actor="agent",
            thread_id="thread-2",
            message="Agent failed",
            details={},
        )
    )

    with TestClient(app) as client:
        app.dependency_overrides[automation_router.get_telemetry_store] = lambda: store
        response = client.get("/api/automation/events?category=agent&event_type=agent_run_failed")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["events"]) == 1
    assert payload["events"][0]["category"] == "agent"
    assert payload["events"][0]["event_type"] == "agent_run_failed"


def test_get_automation_event_returns_single_record(tmp_path):
    app = FastAPI()
    app.include_router(automation_router.router)
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    event = make_event(
        category="thread",
        level="info",
        event_type="thread_stream_finished",
        actor="system",
        thread_id="thread-1",
        message="Thread finished",
        details={"surface": "workspace"},
    )
    store.record_event(event)

    with TestClient(app) as client:
        app.dependency_overrides[automation_router.get_telemetry_store] = lambda: store
        response = client.get(f"/api/automation/events/{event.event_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["event"]["event_id"] == event.event_id
    assert payload["event"]["event_type"] == "thread_stream_finished"


def test_replay_automation_event_dispatches_supported_event():
    app = FastAPI()
    app.include_router(automation_router.router)

    with (
        TestClient(app) as client,
        patch("app.gateway.routers.automation.dispatch_automation_event") as dispatch_mock,
    ):
        response = client.post(
            "/api/automation/events/replay",
            json={
                "event_name": "thread.finished",
                "payload": {"thread_id": "thread-1", "surface": "workspace"},
            },
        )

    assert response.status_code == 200
    dispatch_mock.assert_called_once_with(
        "thread.finished",
        {"thread_id": "thread-1", "surface": "workspace"},
    )


def test_replay_automation_event_rejects_unsupported_event():
    app = FastAPI()
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/events/replay",
            json={
                "event_name": "unsupported.event",
                "payload": {"foo": "bar"},
            },
        )

    assert response.status_code == 400


def test_event_center_flow_can_create_task_replay_event_and_observe_run(tmp_path, monkeypatch):
    app = FastAPI()
    app.include_router(automation_router.router)
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    event = make_event(
        category="thread",
        level="info",
        event_type="thread.finished",
        actor="system",
        thread_id="thread-1",
        message="Thread finished",
        details={"thread_id": "thread-1", "surface": "workspace"},
    )
    store.record_event(event)

    repository = AutomationRepository(tmp_path / "automation.sqlite3")
    scheduler = AutomationScheduler(repository, lock_timeout_seconds=300)

    class DummyExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name: str | None = None, trigger_event_payload=None):
            return AutomationRun(
                id=run_id,
                job_id=job.id,
                started_at="2026-03-29T12:00:00Z",
                finished_at="2026-03-29T12:00:01Z",
                status="succeeded",
                trigger_event_name=trigger_event_name,
                result_summary=f"Handled {trigger_event_name}",
                output_artifacts=[],
                delivery_results=[{"ok": True, "payload": trigger_event_payload or {}}],
            )

    service = AutomationService(
        repository=repository,
        scheduler=scheduler,
        executor=DummyExecutor(),
    )

    app.dependency_overrides[automation_router.get_telemetry_store] = lambda: store
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    monkeypatch.setattr(
        automation_router,
        "dispatch_automation_event",
        lambda event_name, payload: service.handle_event(event_name, payload),
    )

    with TestClient(app) as client:
        detail_response = client.get(f"/api/automation/events/{event.event_id}")
        assert detail_response.status_code == 200
        assert detail_response.json()["event"]["thread_id"] == "thread-1"

        create_response = client.post(
            "/api/automation/jobs",
            json={
                "name": "Thread finished alert",
                "prompt": "Notify me when a thread finishes.",
                "job_kind": "event_task",
                "trigger_kind": "event",
                "trigger_spec": {"event_name": "thread.finished"},
                "action_kind": "notify",
                "action_spec": {"title": "Thread finished"},
                "delivery_mode": "local",
                "delivery_targets": [],
            },
        )
        assert create_response.status_code == 201
        job_id = create_response.json()["job"]["id"]

        replay_response = client.post(
            "/api/automation/events/replay",
            json={
                "event_name": "thread.finished",
                "payload": {"thread_id": "thread-1", "surface": "workspace"},
            },
        )
        assert replay_response.status_code == 200

        runs_response = client.get("/api/automation/runs")

    assert runs_response.status_code == 200
    runs = runs_response.json()["runs"]
    assert len(runs) == 1
    assert runs[0]["job_id"] == job_id
    assert runs[0]["trigger_event_name"] == "thread.finished"
    assert runs[0]["result_summary"] == "Handled thread.finished"


def test_workflow_api_flow_can_run_pause_and_resume(tmp_path):
    app = FastAPI()
    app.include_router(automation_router.router)
    repository = AutomationRepository(tmp_path / "automation.sqlite3")
    scheduler = AutomationScheduler(repository, lock_timeout_seconds=300)

    class DummyWorkflowExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name: str | None = None, trigger_event_payload=None):
            return AutomationRun(
                id=run_id,
                job_id=job.id,
                started_at="2026-03-29T12:00:00Z",
                finished_at=None,
                status="paused",
                trigger_event_name=trigger_event_name,
                result_summary="Waiting for user",
                current_step_id="step-wait",
                step_results=[
                    {"step_id": "step-notify", "status": "succeeded", "attempts": 1},
                    {"step_id": "step-wait", "status": "paused", "attempts": 1},
                ],
            )

        def resume_workflow(self, job, run, *, resume_payload: dict):
            return AutomationRun(
                id=run.id,
                job_id=job.id,
                started_at=run.started_at,
                finished_at="2026-03-29T12:05:00Z",
                status="succeeded",
                trigger_event_name=run.trigger_event_name,
                result_summary="Workflow completed",
                current_step_id=None,
                failed_step_id=None,
                step_results=[
                    {"step_id": "step-notify", "status": "succeeded", "attempts": 1},
                    {"step_id": "step-wait", "status": "succeeded", "attempts": 1, "resume_payload": resume_payload},
                ],
            )

    service = AutomationService(
        repository=repository,
        scheduler=scheduler,
        executor=DummyWorkflowExecutor(),
    )
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service

    with TestClient(app) as client:
        create_response = client.post(
            "/api/automation/jobs",
            json={
                "name": "Reply follow-up workflow",
                "prompt": "Run workflow",
                "job_kind": "workflow",
                "trigger_kind": "event",
                "trigger_spec": {"event_name": "agent.run.completed"},
                "workflow_steps": [
                    {"id": "step-notify", "kind": "notify", "config": {"title": "Reply finished"}},
                    {"id": "step-wait", "kind": "wait_for_user", "config": {"prompt": "Continue?"}},
                ],
                "delivery_mode": "local",
                "delivery_targets": [],
            },
        )
        assert create_response.status_code == 201
        job_id = create_response.json()["job"]["id"]

        run_response = client.post(f"/api/automation/jobs/{job_id}/run")
        assert run_response.status_code == 200
        run_id = run_response.json()["run"]["id"]
        assert run_response.json()["run"]["status"] == "paused"

        resume_response = client.post(
            f"/api/automation/jobs/{job_id}/runs/{run_id}/resume",
            json={"payload": {"answer": "continue"}},
        )
        assert resume_response.status_code == 200
        assert resume_response.json()["run"]["status"] == "succeeded"

        runs_response = client.get("/api/automation/runs")

    assert runs_response.status_code == 200
    runs = runs_response.json()["runs"]
    assert runs[0]["id"] == run_id
    assert runs[0]["status"] == "succeeded"
    assert runs[0]["step_results"][1]["resume_payload"] == {"answer": "continue"}
