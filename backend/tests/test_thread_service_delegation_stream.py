from collections.abc import Generator

from nion.client import StreamEvent
from nion.threads.repository import ThreadRepository
from nion.threads.service import ThreadService


class FakeExecutor:
    def stream(self, **kwargs) -> Generator[StreamEvent, None, None]:
        yield StreamEvent(type="custom", data={"type": "child_run_created", "child_run_id": "child-1"})
        yield StreamEvent(type="custom", data={"type": "child_run_completed", "child_run_id": "child-1", "result": "done"})


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
    assert any(event.type == "messages-tuple" and event.data["type"] == "ai" for event in events)


def test_thread_service_delegated_turn_uses_standard_finishing_path(monkeypatch, tmp_path):
    monkeypatch.setattr(
        "nion.threads.service.resolve_agent_config",
        lambda name: object() if name == "research-agent" else None,
    )
    repository = ThreadRepository(base_dir=tmp_path)

    class FakeLeadClient:
        def stream(self, message, **kwargs):
            yield StreamEvent(
                type="messages-tuple",
                data={"type": "ai", "content": "lead synthesized reply"},
            )
            yield StreamEvent(
                type="values",
                data={
                    "title": "Delegated",
                    "messages": [
                        {"type": "human", "content": message},
                        {"type": "ai", "content": "lead synthesized reply"},
                    ],
                    "artifacts": [],
                },
            )
            yield StreamEvent(
                type="end",
                data={"usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}},
            )

    service = ThreadService(repository=repository, client=FakeLeadClient())
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
    assert persisted.values.messages[-1]["content"] == "lead synthesized reply"
    assert queued["thread_id"] == "thread-1"


def test_thread_service_replays_child_work_products_back_to_lead_agent(monkeypatch):
    monkeypatch.setattr(
        "nion.threads.service.resolve_agent_config",
        lambda name: object() if name == "research-agent" else None,
    )

    captured: dict[str, object] = {}

    class FakeLeadClient:
        def stream(self, message, **kwargs):
            captured["message"] = message
            captured["kwargs"] = kwargs
            yield StreamEvent(
                type="messages-tuple",
                data={"type": "ai", "content": "lead synthesized reply"},
            )
            yield StreamEvent(
                type="values",
                data={
                    "title": "Delegated",
                    "messages": [
                        {"type": "human", "content": message},
                        {"type": "ai", "content": "lead synthesized reply"},
                    ],
                    "artifacts": [],
                },
            )
            yield StreamEvent(
                type="end",
                data={"usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}},
            )

    service = ThreadService(client=FakeLeadClient())
    service._delegated_executor = FakeExecutor()  # noqa: SLF001

    request = service._build_request_for_test(  # noqa: SLF001
        text="@research-agent 搜索这个问题",
        context={"thread_id": "thread-1"},
    )
    events = list(service.stream("thread-1", request))

    assert captured["message"] == "@research-agent 搜索这个问题"
    assert captured["kwargs"]["child_work_products"] == [
        {"agent_name": "research-agent", "result": "done"}
    ]
    assert any(
        event.type == "messages-tuple"
        and event.data["type"] == "ai"
        and event.data["content"] == "lead synthesized reply"
        for event in events
    )
