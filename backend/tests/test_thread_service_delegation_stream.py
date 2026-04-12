from collections.abc import Generator

from nion.client import StreamEvent
from nion.threads.repository import ThreadRepository
from nion.threads.service import ThreadService


class FakeExecutor:
    def stream(self, **kwargs) -> Generator[StreamEvent, None, None]:
        yield StreamEvent(type="custom", data={"type": "child_run_created", "child_run_id": "child-1"})
        yield StreamEvent(type="custom", data={"type": "child_run_completed", "child_run_id": "child-1", "result": "done"})
        yield StreamEvent(type="values", data={"title": "Delegated", "messages": [], "artifacts": []})


def test_thread_service_routes_mentioned_turns_to_delegated_executor(monkeypatch):
    monkeypatch.setattr(
        "nion.threads.service.resolve_agent_config",
        lambda name: object() if name == "research-agent" else None,
    )
    service = ThreadService()
    service._delegated_executor = FakeExecutor()  # noqa: SLF001

    request = service._build_request_for_test(  # noqa: SLF001
        text="@research-agent 搜索这个问题",
        context={"thread_id": "thread-1"},
    )
    events = list(service.stream("thread-1", request))

    assert any(
        event.type == "custom" and event.data["type"] == "child_run_created"
        for event in events
    )
    assert any(
        event.type == "messages-tuple"
        and event.data["type"] == "ai"
        and "research-agent" in event.data["content"]
        for event in events
    )


def test_thread_service_delegated_turn_uses_standard_finishing_path(monkeypatch, tmp_path):
    monkeypatch.setattr(
        "nion.threads.service.resolve_agent_config",
        lambda name: object() if name == "research-agent" else None,
    )
    repository = ThreadRepository(base_dir=tmp_path)
    service = ThreadService(repository=repository)
    service._delegated_executor = FakeExecutor()  # noqa: SLF001

    queued: dict[str, object] = {}
    service._queue_title_generation = lambda **kwargs: queued.update(kwargs)  # type: ignore[method-assign]

    request = service._build_request_for_test(  # noqa: SLF001
        text="@research-agent 搜索这个问题",
        context={
            "thread_id": "thread-1",
            "project_id": "project-1",
            "project_name": "Delegation Project",
            "project_phase": "delivery",
            "primary_plan_id": "plan-1",
        },
    )
    list(service.stream("thread-1", request))

    persisted = repository.get_thread("thread-1")

    assert persisted is not None
    assert persisted.values.cli_management.phase == "inactive"
    assert persisted.values.project == {
        "source": "project",
        "project_id": "project-1",
        "project_name": "Delegation Project",
        "project_phase": "delivery",
        "primary_plan_id": "plan-1",
        "inherit_project_context": True,
    }
    assert persisted.values.messages[-1]["type"] == "ai"
    assert "research-agent" in persisted.values.messages[-1]["content"]
    assert queued["thread_id"] == "thread-1"
