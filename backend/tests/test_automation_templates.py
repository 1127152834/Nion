from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.routers import automation as automation_router
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService
from nion.config.paths import Paths


def test_export_automation_job_returns_manifest_and_package_files(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)
    service.create_job(
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
            "action_kind": "script",
            "action_spec": {"entrypoint": "play_sound.py"},
            "package_files": [
                {"path": "play_sound.py", "content": "print('ding')\n"},
                {"path": "ding.mp3", "content": "fake-audio"},
            ],
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.get("/api/automation/jobs/hook-1/export")

    assert response.status_code == 200
    payload = response.json()
    assert payload["manifest"]["job"]["job_kind"] == "event_task"
    assert payload["manifest"]["package"]["files"] == ["ding.mp3", "play_sound.py"]
    assert payload["files"]["play_sound.py"] == "print('ding')\n"


def test_import_automation_job_creates_a_new_job_from_manifest(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    manifest = {
        "manifest_version": "1",
        "job": {
            "name": "Imported reply workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [
                {"id": "step-notify", "kind": "notify", "config": {"title": "Reply finished"}},
                {"id": "step-wait", "kind": "wait_for_user", "config": {"prompt": "Continue?"}},
            ],
            "delivery_mode": "local",
            "delivery_targets": [],
        },
        "package": {
            "files": [],
        },
    }

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/templates/import",
            json={
                "manifest": manifest,
                "files": {},
            },
        )

    assert response.status_code == 201
    payload = response.json()
    assert payload["job"]["job_kind"] == "workflow"
    assert payload["job"]["workflow_steps"][1]["kind"] == "wait_for_user"


def test_import_automation_job_rejects_invalid_manifest(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/templates/import",
            json={
                "manifest": {"manifest_version": "1", "package": {"files": []}},
                "files": {},
            },
        )

    assert response.status_code == 400
    assert "job" in response.text.lower()


def test_template_round_trip_can_export_import_and_run(tmp_path):
    paths = Paths(base_dir=tmp_path)
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
                trigger_event_name=trigger_event_name,
                result_summary=f"Ran {job.name}",
            )

    service = AutomationService(repository=repo, scheduler=scheduler, executor=DummyExecutor(), paths=paths)
    original = service.create_job(
        {
            "id": "workflow-1",
            "name": "Reply follow-up workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [
                {"id": "step-notify", "kind": "notify", "config": {"title": "Reply finished"}},
                {"id": "step-wait", "kind": "wait_for_user", "config": {"prompt": "Continue?"}},
            ],
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    exported = service.export_job_package(original.id)
    imported = service.import_job_package(exported["manifest"], exported["files"])
    run = service.run_job(imported.id)

    assert imported.id != original.id
    assert imported.job_kind == "workflow"
    assert imported.workflow_steps[1]["kind"] == "wait_for_user"
    assert run.job_id == imported.id
    assert run.status == "succeeded"


def test_import_automation_job_rejects_unsupported_manifest_version(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/templates/import",
            json={
                "manifest": {
                    "manifest_version": "2",
                    "job": {
                        "name": "Bad template",
                        "job_kind": "workflow",
                        "schedule_kind": "event",
                        "schedule_value": "agent.run.completed",
                        "schedule_preset": "event",
                        "trigger_kind": "event",
                        "trigger_spec": {"event_name": "agent.run.completed"},
                        "workflow_steps": [],
                        "delivery_mode": "local",
                        "delivery_targets": [],
                    },
                    "package": {"files": []},
                },
                "files": {},
            },
        )

    assert response.status_code == 400
    assert "manifest_version" in response.text


def test_import_automation_job_rejects_unsupported_job_kind(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/templates/import",
            json={
                "manifest": {
                    "manifest_version": "1",
                    "job": {
                        "name": "Bad template",
                        "job_kind": "unknown",
                        "schedule_kind": "event",
                        "schedule_value": "agent.run.completed",
                        "schedule_preset": "event",
                        "trigger_kind": "event",
                        "trigger_spec": {"event_name": "agent.run.completed"},
                        "delivery_mode": "local",
                        "delivery_targets": [],
                    },
                    "package": {"files": []},
                },
                "files": {},
            },
        )

    assert response.status_code == 400
    assert "job_kind" in response.text


def test_import_automation_job_rejects_unsupported_workflow_step_kind(tmp_path):
    paths = Paths(base_dir=tmp_path)
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)

    app = FastAPI()
    app.dependency_overrides[automation_router.get_automation_service] = lambda: service
    app.include_router(automation_router.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/automation/templates/import",
            json={
                "manifest": {
                    "manifest_version": "1",
                    "job": {
                        "name": "Bad workflow",
                        "job_kind": "workflow",
                        "schedule_kind": "event",
                        "schedule_value": "agent.run.completed",
                        "schedule_preset": "event",
                        "trigger_kind": "event",
                        "trigger_spec": {"event_name": "agent.run.completed"},
                        "workflow_steps": [
                            {"id": "step-x", "kind": "unknown_step", "config": {}},
                        ],
                        "delivery_mode": "local",
                        "delivery_targets": [],
                    },
                    "package": {"files": []},
                },
                "files": {},
            },
        )

    assert response.status_code == 400
    assert "workflow step" in response.text.lower()
