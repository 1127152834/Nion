from collections.abc import Generator

from nion.client import StreamEvent
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
