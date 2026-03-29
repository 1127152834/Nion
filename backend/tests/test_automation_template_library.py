from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.routers import automation as automation_router
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService
from nion.config.paths import Paths


def test_template_library_lists_official_and_personal_templates(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)

    service.save_template(
        {
            "id": "tpl-official-1",
            "name": "Reply finished reminder",
            "scope": "official",
            "manifest": {
                "manifest_version": "1",
                "job": {
                    "name": "Reply finished reminder",
                    "job_kind": "event_task",
                },
                "package": {"files": []},
            },
            "files": {},
        }
    )
    service.save_template(
        {
            "id": "tpl-personal-1",
            "name": "My personal workflow",
            "scope": "personal",
            "manifest": {
                "manifest_version": "1",
                "job": {
                    "name": "My personal workflow",
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
        response = client.get("/api/automation/templates")

    assert response.status_code == 200
    payload = response.json()
    assert payload["official"][0]["name"] == "Reply finished reminder"
    assert payload["personal"][0]["name"] == "My personal workflow"


def test_template_library_includes_seeded_official_templates_by_default(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)

    templates = service.list_templates()

    assert any(template.scope == "official" for template in templates["official"])


def test_save_exported_job_as_personal_template(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)
    job = service.create_job(
        {
            "id": "hook-1",
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
        }
    )

    exported = service.export_job_package(job.id)
    saved = service.save_template(
        {
            "id": "tpl-personal-2",
            "name": "Saved reply alert",
            "scope": "personal",
            "manifest": exported["manifest"],
            "files": exported["files"],
        }
    )
    templates = service.list_templates()

    assert saved.scope == "personal"
    assert templates["personal"][0].name == "Saved reply alert"


def test_save_template_route_persists_personal_template(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/templates",
            json={
                "id": "tpl-personal-3",
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
            },
        )

    assert response.status_code == 201
    templates = service.list_templates()
    assert templates["personal"][0].id == "tpl-personal-3"
