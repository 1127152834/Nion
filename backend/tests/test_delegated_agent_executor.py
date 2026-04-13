from nion.config.agents_config import AgentConfig, AgentDelegationConfig
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


def test_delegated_executor_with_empty_caller_permissions_does_not_fall_back_to_agent_tool_groups(
    tmp_path,
):
    repo = ChildRunRepository(base_dir=tmp_path)
    captured: dict[str, object] = {}

    class CapturingChildClient:
        def stream(self, *args, **kwargs):
            captured.update(kwargs)
            yield StreamEvent(
                type="messages-tuple",
                data={"type": "ai", "content": "policy result"},
            )

    executor = DelegatedAgentExecutor(
        repository=repo,
        client_factory=lambda **kwargs: CapturingChildClient(),
        agent_resolver=lambda name: AgentConfig(
            name=name,
            tool_groups=["web"],
            delegation=AgentDelegationConfig(
                allow_direct_user_reply=False,
                allow_memory_write=False,
            ),
        ),
    )

    list(
        executor.stream(
            parent_thread_id="thread-1",
            agent_name="research-agent",
            prompt="帮我搜索资料",
            caller_permissions=set(),
        )
    )

    assert captured["tool_groups_override"] == []


def test_delegated_executor_applies_policy_to_runtime_kwargs(tmp_path):
    repo = ChildRunRepository(base_dir=tmp_path)
    captured: dict[str, object] = {}

    class CapturingChildClient:
        def stream(self, *args, **kwargs):
            captured.update(kwargs)
            yield StreamEvent(
                type="messages-tuple",
                data={"type": "ai", "content": "policy result"},
            )

    executor = DelegatedAgentExecutor(
        repository=repo,
        client_factory=lambda **kwargs: CapturingChildClient(),
        agent_resolver=lambda name: AgentConfig(
            name=name,
            tool_groups=["web"],
            delegation=AgentDelegationConfig(
                allow_direct_user_reply=False,
                allow_memory_write=False,
                private_skills=["search-web", "rank-sources"],
                delegatable_private_skills=["search-web"],
            ),
        ),
    )

    list(
        executor.stream(
            parent_thread_id="thread-1",
            agent_name="research-agent",
            prompt="帮我搜索资料",
            caller_permissions={"web"},
        )
    )

    assert captured["requested_skills"] == ["search-web"]
    assert captured["tool_groups_override"] == ["web"]
    assert captured["surface"] == "delegated"
    assert captured["include_mcp"] is False
    assert captured["memory_write"] is False
    assert "Do not address the user directly" in str(captured["additional_system_prompt"])


class FailingChildClient:
    def stream(self, *args, **kwargs):
        raise RuntimeError("remote failure")


def test_delegated_executor_marks_child_run_failed_when_child_agent_crashes(tmp_path):
    repo = ChildRunRepository(base_dir=tmp_path)
    executor = DelegatedAgentExecutor(
        repository=repo,
        client_factory=lambda **kwargs: FailingChildClient(),
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
    failed = next(
        event for event in events if event.type == "custom" and event.data["type"] == "child_run_failed"
    )
    stored = repo.get("thread-1", created.data["child_run_id"])

    assert failed.data["error"] == "remote failure"
    assert stored.status == "closed"
    assert stored.error == "remote failure"
