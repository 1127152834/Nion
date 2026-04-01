from nion.automation.models import AutomationJob, AutomationRun
from nion.automation.repository import AutomationRepository


def _job(job_id: str, *, name: str = "Morning summary") -> AutomationJob:
    return AutomationJob(
        id=job_id,
        name=name,
        prompt="Summarize new updates",
        schedule_kind="interval",
        schedule_value="7200",
        enabled=True,
        state="scheduled",
        delivery_mode="local",
        delivery_targets=[],
        skills=["memory"],
        session_policy={
            "session_mode": "automation",
            "memory_read": True,
            "memory_write": False,
            "subagent_enabled": False,
            "thinking_enabled": True,
        },
        toolset_profile="automation",
        next_run_at="2026-03-24T02:00:00Z",
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )


def test_automation_job_round_trip(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    job = _job("job-1")

    repo.save_job(job)

    loaded = repo.get_job("job-1")
    assert loaded is not None
    assert loaded.name == "Morning summary"
    assert loaded.schedule_kind == "interval"
    assert loaded.session_policy["session_mode"] == "automation"


def test_list_jobs_returns_saved_jobs(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(_job("job-1", name="Morning summary"))
    repo.save_job(_job("job-2", name="Evening digest"))

    jobs = repo.list_jobs()

    assert [job.id for job in jobs] == ["job-1", "job-2"]
    assert [job.name for job in jobs] == ["Morning summary", "Evening digest"]


def test_automation_run_round_trip(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(_job("job-1"))
    run = AutomationRun(
        id="run-1",
        job_id="job-1",
        started_at="2026-03-24T01:00:00Z",
        finished_at="2026-03-24T01:01:00Z",
        status="succeeded",
        result_summary="Delivered morning summary",
        output_artifacts=["/mnt/user-data/outputs/summary.md"],
        delivery_results=[
            {
                "mode": "local",
                "status": "delivered",
            }
        ],
    )

    repo.save_run(run)

    loaded = repo.get_run("run-1")
    assert loaded is not None
    assert loaded.job_id == "job-1"
    assert loaded.status == "succeeded"
    assert loaded.delivery_results[0]["status"] == "delivered"


def test_delete_job_removes_job_record(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(_job("job-1"))

    deleted = repo.delete_job("job-1")

    assert deleted is True
    assert repo.get_job("job-1") is None


def test_list_jobs_prunes_legacy_event_task_records(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    legacy_payload = """
    {
      "id": "job-legacy",
      "name": "Legacy hook",
      "prompt": "old hook",
      "job_kind": "event_task",
      "schedule_kind": "event",
      "schedule_value": "thread.finished",
      "schedule_preset": "event",
      "trigger_kind": "event",
      "trigger_spec": {"event_name": "thread.finished"},
      "action_kind": "script",
      "action_spec": {"entrypoint": "hook.py"},
      "delivery_mode": "local",
      "delivery_targets": [],
      "skills": [],
      "session_policy": {},
      "toolset_profile": "automation",
      "package_dir": "/tmp/hooks/job-legacy",
      "package_manifest": {"files": ["hook.py"]},
      "created_at": "2026-03-24T00:00:00Z",
      "updated_at": "2026-03-24T00:00:00Z"
    }
    """.strip()

    with repo._connect() as connection:
        connection.execute(
            """
            INSERT INTO automation_jobs (id, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                "job-legacy",
                legacy_payload,
                "2026-03-24T00:00:00Z",
                "2026-03-24T00:00:00Z",
            ),
        )

    jobs = repo.list_jobs()

    assert jobs == []
    assert repo.get_job("job-legacy") is None
