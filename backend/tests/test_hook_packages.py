from pathlib import Path

from nion.automation.packages import create_hook_package
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService
from nion.config.paths import Paths


def test_create_hook_package_writes_inline_and_copied_files(tmp_path):
    paths = Paths(base_dir=tmp_path)
    source_file = tmp_path / "ding.mp3"
    source_file.write_bytes(b"mp3-data")

    package = create_hook_package(
        paths=paths,
        hook_id="hook-1",
        package_files=[
            {
                "path": "play_sound.py",
                "content": "print('ding')\n",
            },
            {
                "path": "ding.mp3",
                "source_path": str(source_file),
            },
        ],
    )

    package_dir = Path(package["package_dir"])

    assert package_dir.exists()
    assert (package_dir / "play_sound.py").read_text() == "print('ding')\n"
    assert (package_dir / "ding.mp3").read_bytes() == b"mp3-data"
    assert package["package_manifest"]["files"] == ["ding.mp3", "play_sound.py"]


def test_delete_job_removes_hook_package_directory(tmp_path):
    paths = Paths(base_dir=tmp_path)
    package_dir = paths.base_dir / "automation" / "hooks" / "hook-1"
    package_dir.mkdir(parents=True, exist_ok=True)
    (package_dir / "play_sound.py").write_text("print('ding')\n")

    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    service = AutomationService(repository=repo, scheduler=scheduler, paths=paths)
    service.create_job(
        {
            "id": "hook-1",
            "name": "Reply finished alert",
            "prompt": "Notify me",
            "job_kind": "event_task",
            "schedule_kind": "once",
            "schedule_value": "",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "action_kind": "agent_prompt",
            "action_spec": {"channel": "desktop_notification"},
            "package_dir": str(package_dir),
            "package_manifest": {"files": ["play_sound.py"]},
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    deleted = service.delete_job("hook-1")

    assert deleted is True
    assert not package_dir.exists()


def test_update_event_task_package_appends_and_removes_files(tmp_path):
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
            ],
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    updated = service.update_job(
        "hook-1",
        {
            "package_files": [
                {"path": "ding.mp3", "content": "fake-audio"},
            ],
            "delete_package_files": ["play_sound.py"],
        },
    )

    package_dir = Path(str(updated.package_dir))
    assert not (package_dir / "play_sound.py").exists()
    assert (package_dir / "ding.mp3").read_text() == "fake-audio"
    assert updated.package_manifest["files"] == ["ding.mp3"]
