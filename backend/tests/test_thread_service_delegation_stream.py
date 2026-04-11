from __future__ import annotations

from collections.abc import Generator

from nion.client import StreamEvent
from nion.threads.service import ThreadService


class FakeExecutor:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def stream(self, **kwargs) -> Generator[StreamEvent, None, None]:
        self.calls.append(kwargs)
        yield StreamEvent(
            type="custom",
            data={"type": "child_run_created", "child_run_id": "child-1"},
        )
        yield StreamEvent(
            type="custom",
            data={
                "type": "child_run_completed",
                "child_run_id": "child-1",
                "result": "done",
            },
        )


def test_thread_service_routes_mentioned_turns_to_delegated_executor(tmp_path) -> None:
    class FailingClient:
        def stream(self, *args, **kwargs):
            raise AssertionError("lead client should not handle delegated turns")

    service = ThreadService(repository=None, client=FailingClient())
    fake_executor = FakeExecutor()
    service._delegated_executor = fake_executor  # noqa: SLF001

    request = service._build_request_for_test(  # noqa: SLF001
        text="@research-agent 搜索这个问题",
        context={"thread_id": "thread-1"},
    )
    events = list(service.stream("thread-1", request))

    assert any(
        event.type == "custom" and event.data["type"] == "child_run_created"
        for event in events
    )
    assert fake_executor.calls[0]["agent_name"] == "research-agent"
