import importlib
from types import SimpleNamespace

from nion.automation.models import AutomationJob, AutomationRun

automation_tool_module = importlib.import_module("nion.tools.builtins.automation_tool")


def _job(job_id: str) -> AutomationJob:
    return AutomationJob(
        id=job_id,
        name="Morning summary",
        prompt="Summarize updates",
        schedule_kind="interval",
        schedule_value="900",
        delivery_mode="local",
        delivery_targets=[],
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )


def _runtime(context: dict | None = None):
    return SimpleNamespace(context=context or {}, state={}, config={}, tool_call_id="tc-1")


class FakeAutomationService:
    def __init__(self):
        self.calls = []

    def create_job(self, payload):
        self.calls.append(("create", payload))
        return _job("job-1")

    def list_jobs(self):
        self.calls.append(("list",))
        return [_job("job-1")]

    def pause_job(self, job_id: str):
        self.calls.append(("pause", job_id))
        return _job(job_id)

    def resume_job(self, job_id: str):
        self.calls.append(("resume", job_id))
        return _job(job_id)

    def run_job(self, job_id: str):
        self.calls.append(("run", job_id))
        return AutomationRun(
            id="run-1",
            job_id=job_id,
            started_at="2026-03-24T01:00:00Z",
            finished_at="2026-03-24T01:01:00Z",
            status="succeeded",
            result_summary="Delivered summary",
        )

    def delete_job(self, job_id: str):
        self.calls.append(("remove", job_id))
        return True


def test_automation_tool_create_action_calls_service(monkeypatch):
    service = FakeAutomationService()
    monkeypatch.setattr(automation_tool_module, "get_automation_tool_service", lambda runtime=None: service)

    result = automation_tool_module.automation_tool.func(
        runtime=_runtime(),
        action="create",
        name="Morning summary",
        prompt="Summarize updates",
        schedule_kind="interval",
        schedule_value="900",
        delivery_mode="local",
        delivery_targets=[],
        skills=[],
    )

    assert result["job"]["id"] == "job-1"
    assert service.calls[0][0] == "create"


def test_automation_tool_dispatches_list_and_run_actions(monkeypatch):
    service = FakeAutomationService()
    monkeypatch.setattr(automation_tool_module, "get_automation_tool_service", lambda runtime=None: service)

    list_result = automation_tool_module.automation_tool.func(
        runtime=_runtime(),
        action="list",
    )
    run_result = automation_tool_module.automation_tool.func(
        runtime=_runtime(),
        action="run",
        job_id="job-1",
    )

    assert list_result["jobs"][0]["id"] == "job-1"
    assert run_result["run"]["id"] == "run-1"
    assert [call[0] for call in service.calls] == ["list", "run"]


def test_automation_tool_is_blocked_inside_automation_runtime(monkeypatch):
    service = FakeAutomationService()
    monkeypatch.setattr(automation_tool_module, "get_automation_tool_service", lambda runtime=None: service)

    result = automation_tool_module.automation_tool.func(
        runtime=_runtime({"session_mode": "automation"}),
        action="list",
    )

    assert result["ok"] is False
    assert result["code"] == "automation.recursive_call_blocked"
    assert service.calls == []
