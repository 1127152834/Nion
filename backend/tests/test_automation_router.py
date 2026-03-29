from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import automation as automation_router
from nion.automation.models import AutomationJob, AutomationRun


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def _job(job_id: str) -> AutomationJob:
    return AutomationJob(
        id=job_id,
        name="Morning summary",
        prompt="Summarize updates",
        job_kind="scheduled_task",
        schedule_kind="interval",
        schedule_value="900",
        schedule_preset="interval",
        schedule_timezone="UTC",
        schedule_metadata={},
        delivery_mode="local",
        delivery_targets=[],
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )


def _run(run_id: str, job_id: str) -> AutomationRun:
    return AutomationRun(
        id=run_id,
        job_id=job_id,
        started_at="2026-03-24T01:00:00Z",
        finished_at="2026-03-24T01:01:00Z",
        status="succeeded",
        result_summary="Delivered summary",
    )


class FakeAutomationService:
    def __init__(self):
        self.jobs = {"job-1": _job("job-1")}
        self.runs = [_run("run-1", "job-1")]
        self.calls = []

    def list_jobs(self):
        return list(self.jobs.values())

    def create_job(self, payload):
        self.calls.append(("create", payload))
        job = _job("job-2")
        job.name = payload["name"]
        job.job_kind = payload.get("job_kind", job.job_kind)
        if payload.get("schedule_preset") is not None:
            job.schedule_preset = payload["schedule_preset"]
        if payload.get("schedule_timezone") is not None:
            job.schedule_timezone = payload["schedule_timezone"]
        if payload.get("schedule_metadata") is not None:
            job.schedule_metadata = payload["schedule_metadata"]
        self.jobs[job.id] = job
        return job

    def get_job(self, job_id: str):
        return self.jobs[job_id]

    def pause_job(self, job_id: str):
        self.calls.append(("pause", job_id))
        job = self.jobs[job_id]
        job.state = "paused"
        job.enabled = False
        return job

    def resume_job(self, job_id: str, *, now: datetime):
        self.calls.append(("resume", job_id, now))
        job = self.jobs[job_id]
        job.state = "scheduled"
        job.enabled = True
        return job

    def run_job(self, job_id: str):
        self.calls.append(("run", job_id))
        return _run("run-2", job_id)

    def delete_job(self, job_id: str):
        self.calls.append(("delete", job_id))
        self.jobs.pop(job_id, None)
        return True

    def list_runs(self):
        return list(self.runs)

    def resume_workflow_run(self, job_id: str, run_id: str, payload: dict):
        self.calls.append(("resume_workflow_run", job_id, run_id, payload))
        return AutomationRun(
            id=run_id,
            job_id=job_id,
            started_at="2026-03-24T01:00:00Z",
            finished_at="2026-03-24T01:05:00Z",
            status="succeeded",
            result_summary="Workflow completed",
            current_step_id=None,
            step_results=[
                {"step_id": "step-notify", "status": "succeeded", "attempts": 1},
                {"step_id": "step-wait", "status": "succeeded", "attempts": 1},
            ],
        )

    def get_status(self):
        return {
            "scheduler_running": True,
            "total_jobs_count": len(self.jobs),
            "active_jobs_count": 1,
            "paused_jobs_count": 0,
            "error_jobs_count": 0,
            "run_count": len(self.runs),
            "failed_runs_count": 0,
            "last_success_at": "2026-03-24T01:01:00Z",
        }


def _client(service: FakeAutomationService) -> TestClient:
    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)
    return TestClient(app)


def test_gateway_registers_automation_status_route() -> None:
    app = create_app()
    routes = {route.path for route in app.routes}
    assert "/api/automation/status" in routes


def test_create_automation_job():
    service = FakeAutomationService()
    with _client(service) as client:
        response = client.post(
            "/api/automation/jobs",
            json={
                "name": "Nightly digest",
                "prompt": "Summarize updates",
                "job_kind": "reminder",
                "schedule_preset": "daily",
                "schedule_timezone": "Asia/Shanghai",
                "schedule_metadata": {
                    "time_of_day": "09:30",
                },
                "delivery_mode": "local",
                "delivery_targets": [],
            },
        )

    assert response.status_code == 201
    assert response.json()["job"]["name"] == "Nightly digest"
    assert response.json()["job"]["job_kind"] == "reminder"
    assert response.json()["job"]["schedule_preset"] == "daily"
    assert response.json()["job"]["schedule_timezone"] == "Asia/Shanghai"
    assert service.calls[0][1]["job_kind"] == "reminder"
    assert service.calls[0][1]["schedule_preset"] == "daily"
    assert service.calls[0][0] == "create"


def test_create_automation_job_keeps_low_level_schedule_contract():
    service = FakeAutomationService()
    with _client(service) as client:
        response = client.post(
            "/api/automation/jobs",
            json={
                "name": "Low-level interval job",
                "prompt": "Summarize updates",
                "schedule_kind": "interval",
                "schedule_value": "900",
                "delivery_mode": "local",
                "delivery_targets": [],
            },
        )

    assert response.status_code == 201
    assert response.json()["job"]["schedule_preset"] == "interval"
    assert service.calls[0][1]["schedule_kind"] == "interval"
    assert service.calls[0][1]["schedule_value"] == "900"


def test_pause_resume_run_and_delete_actions():
    service = FakeAutomationService()
    with _client(service) as client:
        pause_response = client.post("/api/automation/jobs/job-1/pause")
        resume_response = client.post("/api/automation/jobs/job-1/resume")
        run_response = client.post("/api/automation/jobs/job-1/run")
        delete_response = client.delete("/api/automation/jobs/job-1")

    assert pause_response.status_code == 200
    assert resume_response.status_code == 200
    assert run_response.status_code == 200
    assert delete_response.status_code == 204
    assert [call[0] for call in service.calls[0:4]] == ["pause", "resume", "run", "delete"]


def test_list_runs_and_status():
    service = FakeAutomationService()
    with _client(service) as client:
        runs_response = client.get("/api/automation/runs")
        status_response = client.get("/api/automation/status")

    assert runs_response.status_code == 200
    assert runs_response.json()["runs"][0]["id"] == "run-1"
    assert status_response.status_code == 200
    assert status_response.json()["scheduler_running"] is True


def test_status_response_uses_product_facing_metrics():
    service = FakeAutomationService()
    with _client(service) as client:
        status_response = client.get("/api/automation/status")

    payload = status_response.json()

    assert status_response.status_code == 200
    assert "future_hooks" not in payload
    assert payload["total_jobs_count"] == 1
    assert payload["active_jobs_count"] == 1
    assert payload["paused_jobs_count"] == 0
    assert payload["error_jobs_count"] == 0
    assert payload["failed_runs_count"] == 0
    assert payload["last_success_at"] == "2026-03-24T01:01:00Z"


def test_create_automation_job_rejects_invalid_schedule_kind():
    service = FakeAutomationService()
    with _client(service) as client:
      response = client.post(
          "/api/automation/jobs",
          json={
              "name": "Bad job",
              "prompt": "Summarize updates",
              "schedule_kind": "invalid",
              "schedule_value": "900",
              "delivery_mode": "local",
              "delivery_targets": [],
          },
      )

    assert response.status_code == 422


def test_create_event_task_job():
    service = FakeAutomationService()
    with _client(service) as client:
        response = client.post(
            "/api/automation/jobs",
            json={
                "name": "Reply finished alert",
                "prompt": "Tell me when replies finish",
                "job_kind": "event_task",
                "trigger_kind": "event",
                "trigger_spec": {"event_name": "agent.run.completed"},
                "action_kind": "agent_prompt",
                "action_spec": {"channel": "desktop_notification"},
                "delivery_mode": "local",
                "delivery_targets": [],
            },
        )

    assert response.status_code == 201
    assert response.json()["job"]["job_kind"] == "event_task"
    assert service.calls[0][1]["trigger_kind"] == "event"
    assert service.calls[0][1]["trigger_spec"]["event_name"] == "agent.run.completed"


def test_update_event_task_job():
    service = FakeAutomationService()

    def update_job(job_id: str, payload):
        service.calls.append(("update", job_id, payload))
        job = service.jobs[job_id]
        job.name = payload.get("name", job.name)
        job.trigger_spec = payload.get("trigger_spec", job.trigger_spec)
        job.action_kind = payload.get("action_kind", job.action_kind)
        return job

    service.update_job = update_job  # type: ignore[attr-defined]

    with _client(service) as client:
        response = client.patch(
            "/api/automation/jobs/job-1",
            json={
                "name": "Updated event task",
                "trigger_spec": {"event_name": "thread.finished"},
                "action_kind": "notebook_write",
            },
        )

    assert response.status_code == 200
    assert response.json()["job"]["name"] == "Updated event task"
    assert service.calls[0][0] == "update"
    assert service.calls[0][2]["trigger_spec"]["event_name"] == "thread.finished"


def test_serve_automation_package_file():
    service = FakeAutomationService()
    package_dir = Path("/tmp/automation-hook")
    package_dir.mkdir(parents=True, exist_ok=True)
    (package_dir / "tone.mp3").write_bytes(b"audio")
    service.jobs["job-1"].package_dir = str(package_dir)

    with _client(service) as client:
        response = client.get("/api/automation/jobs/job-1/package/files/tone.mp3")

    assert response.status_code == 200
    assert response.content == b"audio"


def test_create_workflow_job():
    service = FakeAutomationService()
    with _client(service) as client:
        response = client.post(
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

    assert response.status_code == 201
    assert service.calls[0][1]["job_kind"] == "workflow"
    assert service.calls[0][1]["workflow_steps"][1]["kind"] == "wait_for_user"


def test_resume_workflow_run():
    service = FakeAutomationService()
    with _client(service) as client:
        response = client.post(
            "/api/automation/jobs/job-1/runs/run-1/resume",
            json={"payload": {"answer": "continue"}},
        )

    assert response.status_code == 200
    assert response.json()["run"]["status"] == "succeeded"
    assert service.calls[0] == ("resume_workflow_run", "job-1", "run-1", {"answer": "continue"})
