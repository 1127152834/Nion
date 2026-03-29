from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.routers import automation as automation_router
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService
from nion.config.paths import Paths


def test_get_template_returns_saved_template_detail(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)
    service.save_template(
        {
            "id": "tpl-personal-1",
            "name": "Saved workflow",
            "scope": "personal",
            "manifest": {
                "manifest_version": "1",
                "job": {
                    "name": "Saved workflow",
                    "job_kind": "workflow",
                },
                "package": {"files": []},
            },
            "files": {},
        }
    )

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.get("/api/automation/templates/tpl-personal-1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["template"]["id"] == "tpl-personal-1"
    assert payload["template"]["manifest"]["job"]["job_kind"] == "workflow"


def test_activate_template_creates_job_from_template_manifest(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)
    service.save_template(
        {
            "id": "tpl-personal-1",
            "name": "Saved workflow",
            "scope": "personal",
            "manifest": {
                "manifest_version": "1",
                "job": {
                    "name": "Saved workflow",
                    "prompt": "Run workflow",
                    "job_kind": "workflow",
                    "schedule_kind": "event",
                    "schedule_value": "agent.run.completed",
                    "schedule_preset": "event",
                    "trigger_kind": "event",
                    "trigger_spec": {"event_name": "agent.run.completed"},
                    "workflow_steps": [
                        {"id": "step-notify", "kind": "notify", "config": {"title": "Reply finished"}},
                    ],
                    "delivery_mode": "local",
                    "delivery_targets": [],
                },
                "package": {"files": []},
            },
            "files": {},
        }
    )

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post("/api/automation/templates/tpl-personal-1/activate")

    assert response.status_code == 201
    payload = response.json()
    assert payload["job"]["job_kind"] == "workflow"
    assert payload["job"]["workflow_steps"][0]["kind"] == "notify"
