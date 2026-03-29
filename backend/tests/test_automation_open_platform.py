from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.routers import automation as automation_router
from nion.automation.delivery import AutomationDeliveryService
from nion.automation.executor import AutomationExecutor
from nion.automation.models import AutomationRun
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService


class _UnusedRunner:
    def run(self, *, prompt: str, thread_id: str, context: dict, config: dict):
        raise AssertionError("Runtime runner should not be used for plugin_action tests")


def test_external_webhook_event_dispatches_matching_webhook_job(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    class DummyExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name=None, trigger_event_payload=None):
            return AutomationRun(
                id=run_id,
                job_id=job.id,
                started_at="2026-03-29T12:00:00Z",
                finished_at="2026-03-29T12:00:01Z",
                status="succeeded",
                trigger_event_name=trigger_event_name,
                result_summary="Webhook handled",
            )

    service = AutomationService(repository=repo, scheduler=scheduler, executor=DummyExecutor())
    service.create_job(
        {
            "name": "External webhook workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "external.build.completed",
            "schedule_preset": "event",
            "trigger_kind": "webhook",
            "trigger_spec": {"event_name": "external.build.completed"},
            "workflow_steps": [],
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/webhooks/events",
            json={
                "version": "1",
                "event_name": "external.build.completed",
                "payload": {"build_id": "build-1"},
            },
        )

    assert response.status_code == 202
    assert response.json()["runs"][0]["result_summary"] == "Webhook handled"


def test_external_webhook_rejects_invalid_version(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler)

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/webhooks/events",
            json={
                "version": "2",
                "event_name": "external.build.completed",
                "payload": {"build_id": "build-1"},
            },
        )

    assert response.status_code == 400
    assert "version" in response.text.lower()


def test_plugin_action_job_rejects_unknown_plugin_action(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    executor = AutomationExecutor(
        runtime_runner=_UnusedRunner(),
        delivery_service=AutomationDeliveryService(),
    )
    service = AutomationService(repository=repo, scheduler=scheduler, executor=executor)

    try:
        service.create_job(
            {
                "name": "Plugin action workflow",
                "prompt": "Run workflow",
                "job_kind": "workflow",
                "schedule_kind": "event",
                "schedule_value": "external.build.completed",
                "schedule_preset": "event",
                "trigger_kind": "webhook",
                "trigger_spec": {"event_name": "external.build.completed"},
                "action_kind": "plugin_action",
                "action_spec": {"plugin_id": "missing.plugin"},
                "delivery_mode": "local",
                "delivery_targets": [],
            }
        )
    except ValueError as error:
        assert "plugin" in str(error).lower()
    else:
        raise AssertionError("Expected ValueError for unknown plugin action")


def test_plugin_action_job_executes_registered_plugin_action(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    executor = AutomationExecutor(
        runtime_runner=_UnusedRunner(),
        delivery_service=AutomationDeliveryService(),
    )
    service = AutomationService(repository=repo, scheduler=scheduler, executor=executor)
    job = service.create_job(
        {
            "name": "Plugin action job",
            "prompt": "Run plugin action",
            "job_kind": "event_task",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "action_kind": "plugin_action",
            "action_spec": {"plugin_id": "echo.plugin", "message": "hello"},
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    run = service.run_job(job.id)

    assert run.status == "succeeded"
    assert "hello" in run.result_summary


def test_external_webhook_can_trigger_registered_plugin_action(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    executor = AutomationExecutor(
        runtime_runner=_UnusedRunner(),
        delivery_service=AutomationDeliveryService(),
    )
    service = AutomationService(repository=repo, scheduler=scheduler, executor=executor)
    service.create_job(
        {
            "name": "Webhook plugin action",
            "prompt": "Run plugin action",
            "job_kind": "event_task",
            "schedule_kind": "event",
            "schedule_value": "external.build.completed",
            "schedule_preset": "event",
            "trigger_kind": "webhook",
            "trigger_spec": {"event_name": "external.build.completed"},
            "action_kind": "plugin_action",
            "action_spec": {"plugin_id": "echo.plugin", "message": "webhook hello"},
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/webhooks/events",
            json={
                "version": "1",
                "event_name": "external.build.completed",
                "payload": {"build_id": "build-1"},
            },
        )

    assert response.status_code == 202
    assert "webhook hello" in response.json()["runs"][0]["result_summary"]


def test_open_platform_capabilities_endpoint_reports_webhook_and_plugins():
    app = FastAPI()
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.get("/api/automation/platform/capabilities")

    assert response.status_code == 200
    payload = response.json()
    assert payload["webhook_event_versions"] == ["1"]
    assert "echo.plugin" in payload["plugin_actions"]


def test_open_platform_connectors_endpoint_reports_builtin_connectors():
    app = FastAPI()
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.get("/api/automation/platform/connectors")

    assert response.status_code == 200
    payload = response.json()
    assert payload["connectors"][0]["id"] == "generic_webhook"
