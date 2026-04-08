from uuid import UUID

from nion.automation.executor import (
    AutomationExecutor,
    LangGraphAutomationRunner,
    build_automation_runtime_config,
)
from nion.automation.models import AutomationExecutionOutput, AutomationJob


def _job(job_id: str) -> AutomationJob:
    return AutomationJob(
        id=job_id,
        name="Morning summary",
        prompt="Summarize new updates",
        schedule_kind="interval",
        schedule_value="900",
        enabled=True,
        state="scheduled",
        delivery_mode="local",
        delivery_targets=[],
        skills=["memory", "calendar"],
        session_policy={
            "session_mode": "automation",
            "memory_read": True,
            "memory_write": False,
            "subagent_enabled": True,
            "thinking_enabled": True,
        },
        toolset_profile="automation",
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )


def test_executor_builds_fresh_runtime_config():
    job = _job("job-1")

    runtime_config = build_automation_runtime_config(
        job,
        run_id="run-1",
        isolated_thread_id="automation-job-1-run-1",
    )

    assert runtime_config["thread_id"] == "automation-job-1-run-1"
    assert runtime_config["context"]["session_mode"] == "automation"
    assert runtime_config["context"]["surface"] == "automation"
    assert runtime_config["context"]["memory_write"] is False
    assert runtime_config["context"]["subagent_enabled"] is False
    assert runtime_config["context"]["automation_run_id"] == "run-1"
    assert runtime_config["context"]["attached_skills"] == ["memory", "calendar"]


def test_executor_runs_job_in_isolated_session_and_delivers_result():
    job = _job("job-1")
    captured = {}

    class DummyRunner:
        def run(self, *, prompt, thread_id, context, config):
            captured["prompt"] = prompt
            captured["thread_id"] = thread_id
            captured["context"] = context
            captured["config"] = config
            return AutomationExecutionOutput(
                response_text="All done",
                artifacts=["/mnt/user-data/outputs/report.md"],
            )

    class DummyDelivery:
        def deliver(self, job, execution_output):
            captured["delivered_job_id"] = job.id
            captured["delivered_artifacts"] = execution_output.artifacts
            return [{"mode": "local", "status": "delivered"}]

    executor = AutomationExecutor(runtime_runner=DummyRunner(), delivery_service=DummyDelivery())

    result = executor.execute_job(job, run_id="run-1")

    assert captured["prompt"] == "Summarize new updates"
    assert str(UUID(captured["thread_id"])) == captured["thread_id"]
    assert captured["context"]["session_mode"] == "automation"
    assert captured["context"]["subagent_enabled"] is False
    assert captured["context"]["automation_job_id"] == "job-1"
    assert captured["context"]["automation_run_id"] == "run-1"
    assert captured["delivered_job_id"] == "job-1"
    assert result.status == "succeeded"
    assert result.result_summary == "All done"
    assert result.delivery_results[0]["status"] == "delivered"


def test_executor_delivers_reminder_as_plain_text_without_invoking_runner():
    job = _job("job-reminder")
    job.job_kind = "reminder"
    job.name = "Drink water"
    job.prompt = "提醒我喝水"
    captured = {"runner_called": False}

    class DummyRunner:
        def run(self, *, prompt, thread_id, context, config):
            del prompt, thread_id, context, config
            captured["runner_called"] = True
            return AutomationExecutionOutput(
                response_text="该喝水啦！",
                artifacts=[],
            )

    class DummyDelivery:
        def deliver(self, job, execution_output):
            captured["delivery_text"] = execution_output.response_text
            captured["delivery_thread_id"] = execution_output.isolated_thread_id
            return [{"mode": "local", "status": "recorded"}]

    executor = AutomationExecutor(runtime_runner=DummyRunner(), delivery_service=DummyDelivery())

    result = executor.execute_job(job, run_id="run-reminder")

    assert captured["runner_called"] is False
    assert captured["delivery_text"] == "提醒我喝水"
    assert captured["delivery_thread_id"] is None
    assert result.result_summary == "提醒我喝水"
    assert result.isolated_thread_id is None
    assert result.status == "succeeded"


def test_executor_marks_run_failed_when_delivery_is_unavailable():
    job = _job("job-1")

    class DummyRunner:
        def run(self, *, prompt, thread_id, context, config):
            return AutomationExecutionOutput(
                response_text="All done",
                artifacts=[],
            )

    class DummyDelivery:
        def deliver(self, job, execution_output):
            return [{"mode": "channel", "status": "unavailable"}]

    executor = AutomationExecutor(runtime_runner=DummyRunner(), delivery_service=DummyDelivery())

    result = executor.execute_job(job, run_id="run-1")

    assert result.status == "failed"
    assert result.delivery_results[0]["status"] == "unavailable"


def test_executor_uses_runner_isolated_thread_id_on_run_result():
    job = _job("job-1")
    runner_thread_id = "thread-from-runner"

    class DummyRunner:
        def run(self, *, prompt, thread_id, context, config):
            return AutomationExecutionOutput(
                response_text="All done",
                artifacts=[],
                isolated_thread_id=runner_thread_id,
            )

    class DummyDelivery:
        def deliver(self, job, execution_output):
            return [{"mode": "local", "status": "delivered"}]

    executor = AutomationExecutor(runtime_runner=DummyRunner(), delivery_service=DummyDelivery())

    result = executor.execute_job(job, run_id="run-1")

    assert result.isolated_thread_id == runner_thread_id


def test_langgraph_runner_creates_missing_thread(monkeypatch):
    captured = {}

    class DummyRuns:
        def wait(self, thread_id, assistant_id, **kwargs):
            captured["thread_id"] = thread_id
            captured["assistant_id"] = assistant_id
            captured["kwargs"] = kwargs
            return {"messages": [{"type": "ai", "content": "Done"}]}

    class DummyClient:
        def __init__(self):
            self.runs = DummyRuns()

    monkeypatch.setattr("nion.automation.executor.get_sync_client", lambda url: DummyClient())

    runner = LangGraphAutomationRunner(langgraph_url="http://localhost:2024")
    output = runner.run(
        prompt="Summarize updates",
        thread_id="01234567-89ab-cdef-0123-456789abcdef",
        context={"session_mode": "automation"},
        config={"recursion_limit": 100},
    )

    assert output.response_text == "Done"
    assert captured["thread_id"] == "01234567-89ab-cdef-0123-456789abcdef"
    assert captured["kwargs"]["if_not_exists"] == "create"
