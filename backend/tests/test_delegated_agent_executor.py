from nion.client import StreamEvent
from nion.orchestration.delegated_agent_executor import DelegatedAgentExecutor
from nion.orchestration.repository import ChildRunRepository


class FakeChildClient:
    def stream(self, *args, **kwargs):
        yield StreamEvent(
            type="messages-tuple",
            data={"type": "ai", "content": "第一步分析完成"},
        )
        yield StreamEvent(
            type="messages-tuple",
            data={"type": "tool", "name": "web_search", "content": "搜索完成"},
        )
        yield StreamEvent(
            type="messages-tuple",
            data={"type": "ai", "content": "最终结果"},
        )


def test_delegated_executor_persists_child_run_messages(tmp_path):
    repo = ChildRunRepository(base_dir=tmp_path)
    executor = DelegatedAgentExecutor(
        repository=repo,
        client_factory=lambda **kwargs: FakeChildClient(),
    )

    events = list(
        executor.stream(
            parent_thread_id="thread-1",
            agent_name="research-agent",
            prompt="帮我搜索资料",
        )
    )

    created = next(
        event for event in events if event.type == "custom" and event.data["type"] == "child_run_created"
    )
    child_run_id = created.data["child_run_id"]
    stored = repo.get("thread-1", child_run_id)

    assert stored.result == "最终结果"
    assert [message.role for message in stored.messages] == ["human", "ai", "tool", "ai"]
    assert stored.messages[0].content == "帮我搜索资料"
    assert stored.messages[-1].content == "最终结果"
