from nion.automation.delivery import AutomationDeliveryService
from nion.automation.executor import AutomationExecutor
from nion.automation.models import AutomationJob


class _UnusedRunner:
    def run(self, *, prompt: str, thread_id: str, context: dict, config: dict):
        raise AssertionError("Runtime runner should not be used in workflow unit tests")


class _RecordingRunner:
    def __init__(self):
        self.calls: list[str] = []

    def run(self, *, prompt: str, thread_id: str, context: dict, config: dict):
        self.calls.append(prompt)
        return type(
            "Result",
            (),
            {
                "response_text": f"Ran prompt: {prompt}",
                "artifacts": [],
                "isolated_thread_id": thread_id,
            },
        )()


def _workflow_job(steps: list[dict]) -> AutomationJob:
    return AutomationJob(
        id="workflow-1",
        name="Reply follow-up workflow",
        prompt="Run workflow",
        job_kind="workflow",
        schedule_kind="event",
        schedule_value="agent.run.completed",
        schedule_preset="event",
        trigger_kind="event",
        trigger_spec={"event_name": "agent.run.completed"},
        action_kind="agent_prompt",
        action_spec={},
        workflow_steps=steps,
        delivery_mode="local",
        delivery_targets=[],
        created_at="2026-03-29T00:00:00Z",
        updated_at="2026-03-29T00:00:00Z",
    )


def test_workflow_executes_ordered_steps():
    executor = AutomationExecutor(
        runtime_runner=_UnusedRunner(),
        delivery_service=AutomationDeliveryService(),
    )
    job = _workflow_job(
        [
            {"id": "step-notify", "kind": "notify", "config": {"title": "Reply finished", "body": "done"}},
            {"id": "step-delay", "kind": "delay", "config": {"seconds": 1}},
            {"id": "step-sound", "kind": "play_sound", "config": {"sound": "ding"}},
        ]
    )

    run = executor.execute_job(job, run_id="run-1", trigger_event_name="agent.run.completed")

    assert run.status == "succeeded"
    assert run.result_summary == "Workflow completed"
    assert run.step_results[0]["step_id"] == "step-notify"
    assert run.step_results[1]["step_id"] == "step-delay"
    assert run.step_results[2]["step_id"] == "step-sound"
    assert run.step_results[2]["status"] == "succeeded"


def test_workflow_wait_for_user_pauses_run():
    executor = AutomationExecutor(
        runtime_runner=_UnusedRunner(),
        delivery_service=AutomationDeliveryService(),
    )
    job = _workflow_job(
        [
            {"id": "step-notify", "kind": "notify", "config": {"title": "Reply finished"}},
            {"id": "step-wait", "kind": "wait_for_user", "config": {"prompt": "Continue?"}},
        ]
    )

    run = executor.execute_job(job, run_id="run-1", trigger_event_name="agent.run.completed")

    assert run.status == "paused"
    assert run.current_step_id == "step-wait"
    assert run.step_results[0]["status"] == "succeeded"
    assert run.step_results[1]["status"] == "paused"


def test_workflow_retry_exhaustion_reports_failing_step():
    executor = AutomationExecutor(
        runtime_runner=_UnusedRunner(),
        delivery_service=AutomationDeliveryService(),
    )
    job = _workflow_job(
        [
            {
                "id": "step-script",
                "kind": "script",
                "config": {"entrypoint": "missing.py"},
                "retry_limit": 2,
            }
        ]
    )

    run = executor.execute_job(job, run_id="run-1", trigger_event_name="agent.run.completed")

    assert run.status == "failed"
    assert run.failed_step_id == "step-script"
    assert run.step_results[0]["attempts"] == 3
    assert run.step_results[0]["status"] == "failed"


def test_workflow_agent_prompt_step_uses_runtime_runner():
    runner = _RecordingRunner()
    executor = AutomationExecutor(
        runtime_runner=runner,
        delivery_service=AutomationDeliveryService(),
    )
    job = _workflow_job(
        [
            {"id": "step-agent", "kind": "agent_prompt", "config": {"prompt": "Summarize the reply"}},
        ]
    )

    run = executor.execute_job(job, run_id="run-1", trigger_event_name="agent.run.completed")

    assert run.status == "succeeded"
    assert runner.calls == ["Summarize the reply"]
    assert run.step_results[0]["status"] == "succeeded"


def test_resume_workflow_continues_remaining_steps_after_wait():
    runner = _RecordingRunner()
    executor = AutomationExecutor(
        runtime_runner=runner,
        delivery_service=AutomationDeliveryService(),
    )
    job = _workflow_job(
        [
            {"id": "step-notify", "kind": "notify", "config": {"title": "Reply finished"}},
            {"id": "step-wait", "kind": "wait_for_user", "config": {"prompt": "Continue?"}},
            {"id": "step-agent", "kind": "agent_prompt", "config": {"prompt": "Archive the summary"}},
        ]
    )

    paused = executor.execute_job(job, run_id="run-1", trigger_event_name="agent.run.completed")
    resumed = executor.resume_workflow(job, paused, resume_payload={"answer": "continue"})

    assert resumed.status == "succeeded"
    assert resumed.current_step_id is None
    assert resumed.step_results[1]["status"] == "succeeded"
    assert resumed.step_results[1]["resume_payload"] == {"answer": "continue"}
    assert resumed.step_results[2]["step_id"] == "step-agent"
    assert resumed.step_results[2]["status"] == "succeeded"
    assert runner.calls == ["Archive the summary"]
