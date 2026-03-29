from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.routers import automation as automation_router
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService


def test_job_governance_fields_round_trip(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler)

    job = service.create_job(
        {
            "name": "Reply finished alert",
            "prompt": "Notify me",
            "job_kind": "event_task",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "action_kind": "notify",
            "action_spec": {"title": "Reply finished"},
            "delivery_mode": "local",
            "delivery_targets": [],
            "owner_id": "user-1",
            "visibility": "shared",
        }
    )

    assert job.owner_id == "user-1"
    assert job.visibility == "shared"


def test_request_approval_creates_pending_record(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler)
    job = service.create_job(
        {
            "name": "Dangerous workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [],
            "delivery_mode": "local",
            "delivery_targets": [],
            "owner_id": "user-1",
            "visibility": "shared",
            "approval_policy": {"required": True},
        }
    )

    approval = service.request_approval(job.id, actor_id="user-2", reason="High-risk action")

    assert approval.status == "pending"
    assert approval.job_id == job.id
    assert approval.requested_by == "user-2"


def test_decide_approval_updates_status_and_creates_audit_record(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler)
    job = service.create_job(
        {
            "name": "Dangerous workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [],
            "delivery_mode": "local",
            "delivery_targets": [],
            "owner_id": "user-1",
            "visibility": "shared",
            "approval_policy": {"required": True},
        }
    )
    approval = service.request_approval(job.id, actor_id="user-2", reason="High-risk action")

    decided = service.decide_approval(approval.id, actor_id="approver-1", decision="approved")
    audit = service.list_audit_events()

    assert decided.status == "approved"
    assert audit[-1].action == "approval.approved"
    assert audit[-1].actor_id == "approver-1"


def test_governance_routes_expose_approval_flow(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler)
    job = service.create_job(
        {
            "name": "Dangerous workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [],
            "delivery_mode": "local",
            "delivery_targets": [],
            "owner_id": "user-1",
            "visibility": "shared",
            "approval_policy": {"required": True},
        }
    )

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        request_response = client.post(
            f"/api/automation/jobs/{job.id}/approvals",
            json={"actor_id": "user-2", "reason": "High-risk action"},
        )
        approval_id = request_response.json()["approval"]["id"]
        decide_response = client.post(
            f"/api/automation/approvals/{approval_id}/decision",
            json={"actor_id": "approver-1", "decision": "approved"},
        )
        audit_response = client.get("/api/automation/audit")

    assert request_response.status_code == 201
    assert decide_response.status_code == 200
    assert audit_response.status_code == 200


def test_run_job_is_blocked_when_approval_is_required_and_missing(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    class DummyExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name=None, trigger_event_payload=None):
            raise AssertionError("Executor should not run before approval")

    service = AutomationService(repository=repo, scheduler=scheduler, executor=DummyExecutor())
    job = service.create_job(
        {
            "name": "Dangerous workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [],
            "delivery_mode": "local",
            "delivery_targets": [],
            "owner_id": "user-1",
            "visibility": "shared",
            "approval_policy": {"required": True},
        }
    )

    try:
        service.run_job(job.id)
    except PermissionError as error:
        assert "approval" in str(error).lower()
    else:
        raise AssertionError("Expected PermissionError when approval is missing")


def test_run_job_succeeds_after_approval_is_granted(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    class DummyExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name=None, trigger_event_payload=None):
            from nion.automation.models import AutomationRun

            return AutomationRun(
                id=run_id,
                job_id=job.id,
                started_at="2026-03-29T12:00:00Z",
                finished_at="2026-03-29T12:00:01Z",
                status="succeeded",
                result_summary="Ran with approval",
            )

    service = AutomationService(repository=repo, scheduler=scheduler, executor=DummyExecutor())
    job = service.create_job(
        {
            "name": "Dangerous workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [],
            "delivery_mode": "local",
            "delivery_targets": [],
            "owner_id": "user-1",
            "visibility": "shared",
            "approval_policy": {"required": True},
        }
    )
    approval = service.request_approval(job.id, actor_id="user-2", reason="High-risk action")
    service.decide_approval(approval.id, actor_id="approver-1", decision="approved")

    run = service.run_job(job.id)

    assert run.status == "succeeded"


def test_run_job_stays_blocked_after_denial(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    class DummyExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name=None, trigger_event_payload=None):
            raise AssertionError("Executor should not run after denial")

    service = AutomationService(repository=repo, scheduler=scheduler, executor=DummyExecutor())
    job = service.create_job(
        {
            "name": "Dangerous workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [],
            "delivery_mode": "local",
            "delivery_targets": [],
            "owner_id": "user-1",
            "visibility": "shared",
            "approval_policy": {"required": True},
        }
    )
    approval = service.request_approval(job.id, actor_id="user-2", reason="High-risk action")
    service.decide_approval(approval.id, actor_id="approver-1", decision="denied")

    try:
        service.run_job(job.id)
    except PermissionError as error:
        assert "approval" in str(error).lower()
    else:
        raise AssertionError("Expected PermissionError after denial")


def test_run_route_returns_403_when_approval_is_missing(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    class DummyExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name=None, trigger_event_payload=None):
            raise AssertionError("Executor should not run before approval")

    service = AutomationService(repository=repo, scheduler=scheduler, executor=DummyExecutor())
    job = service.create_job(
        {
            "name": "Dangerous workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [],
            "delivery_mode": "local",
            "delivery_targets": [],
            "owner_id": "user-1",
            "visibility": "shared",
            "approval_policy": {"required": True},
        }
    )

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(f"/api/automation/jobs/{job.id}/run")

    assert response.status_code == 403
    assert "approval" in response.text.lower()
