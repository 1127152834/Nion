
from nion.automation.models import AutomationJob
from nion.automation.script_runner import run_packaged_script


def test_run_packaged_script_executes_package_local_entrypoint(tmp_path):
    package_dir = tmp_path / "hooks" / "hook-1"
    package_dir.mkdir(parents=True, exist_ok=True)
    script = package_dir / "play_sound.py"
    script.write_text("print('ding from script')\n")

    job = AutomationJob(
        id="hook-1",
        name="Reply finished alert",
        prompt="",
        job_kind="event_task",
        schedule_kind="event",
        schedule_value="agent.run.completed",
        schedule_preset="event",
        trigger_kind="event",
        trigger_spec={"event_name": "agent.run.completed"},
        action_kind="script",
        action_spec={"entrypoint": "play_sound.py"},
        package_dir=str(package_dir),
        package_manifest={"files": ["play_sound.py"]},
        delivery_mode="local",
        delivery_targets=[],
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )

    result = run_packaged_script(
        job,
        trigger_event_name="agent.run.completed",
        trigger_event_payload={"thread_id": "thread-1"},
    )

    assert result.response_text.strip() == "ding from script"


def test_run_packaged_script_rejects_missing_entrypoint(tmp_path):
    package_dir = tmp_path / "hooks" / "hook-1"
    package_dir.mkdir(parents=True, exist_ok=True)

    job = AutomationJob(
        id="hook-1",
        name="Reply finished alert",
        prompt="",
        job_kind="event_task",
        schedule_kind="event",
        schedule_value="agent.run.completed",
        schedule_preset="event",
        trigger_kind="event",
        trigger_spec={"event_name": "agent.run.completed"},
        action_kind="script",
        action_spec={"entrypoint": "missing.py"},
        package_dir=str(package_dir),
        package_manifest={"files": []},
        delivery_mode="local",
        delivery_targets=[],
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )

    try:
        run_packaged_script(
            job,
            trigger_event_name="agent.run.completed",
            trigger_event_payload={"thread_id": "thread-1"},
        )
    except FileNotFoundError as error:
        assert "missing.py" in str(error)
    else:
        raise AssertionError("Expected FileNotFoundError for missing packaged entrypoint")
