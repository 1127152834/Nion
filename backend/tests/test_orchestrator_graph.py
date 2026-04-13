from langgraph.checkpoint.memory import InMemorySaver
from nion.client import StreamEvent

from nion.orchestration.graph import build_agent_orchestrator_graph


def test_orchestrator_graph_short_circuits_when_no_mentions():
    class FakeExecutor:
        def stream(self, **kwargs):
            if False:
                yield None

    graph = build_agent_orchestrator_graph(
        checkpointer=InMemorySaver(),
        delegated_executor=FakeExecutor(),
        agent_resolver=lambda _name: None,
    )
    result = graph.invoke(
        {"user_text": "普通单智能体问题", "thread_id": "thread-1"},
        config={"configurable": {"thread_id": "thread-1"}},
    )
    assert result["mode"] == "lead_only"


def test_orchestrator_graph_runs_agent_chain_sequentially_with_upstream_context():
    calls: list[tuple[str, str]] = []

    class FakeExecutor:
        def stream(
            self,
            *,
            parent_thread_id: str,
            agent_name: str,
            prompt: str,
            model_name=None,
            caller_permissions=None,
        ):
            calls.append((agent_name, prompt))
            yield StreamEvent(
                type="custom",
                data={
                    "type": "child_run_created",
                    "child_run_id": f"{agent_name}-run",
                    "agent_name": agent_name,
                },
            )
            yield StreamEvent(
                type="custom",
                data={
                    "type": "child_run_completed",
                    "child_run_id": f"{agent_name}-run",
                    "result": f"{agent_name}-done",
                },
            )
            yield StreamEvent(
                type="custom",
                data={
                    "type": "child_run_closed",
                    "child_run_id": f"{agent_name}-run",
                },
            )

    graph = build_agent_orchestrator_graph(
        checkpointer=InMemorySaver(),
        delegated_executor=FakeExecutor(),
        agent_resolver=lambda _name: object(),
    )
    result = graph.invoke(
        {
            "user_text": "@research-agent 搜索资料，交给 @writer-agent 总结三条，再交给 @formatter-agent 输出 HTML",
            "thread_id": "thread-1",
        },
        config={"configurable": {"thread_id": "thread-1"}},
    )

    assert [name for name, _prompt in calls] == [
        "research-agent",
        "writer-agent",
        "formatter-agent",
    ]
    assert "搜索资料" in calls[0][1]
    assert "research-agent-done" in calls[1][1]
    assert "writer-agent-done" in calls[2][1]
    assert result["final_reply"] == ""
    assert result["child_work_products"] == [
        {"agent_name": "research-agent", "result": "research-agent-done"},
        {"agent_name": "writer-agent", "result": "writer-agent-done"},
        {"agent_name": "formatter-agent", "result": "formatter-agent-done"},
    ]


def test_orchestrator_graph_does_not_leak_child_results_between_same_thread_invocations():
    calls: list[tuple[str, str]] = []

    class FakeExecutor:
        def stream(
            self,
            *,
            parent_thread_id: str,
            agent_name: str,
            prompt: str,
            model_name=None,
            caller_permissions=None,
        ):
            calls.append((agent_name, prompt))
            yield StreamEvent(
                type="custom",
                data={
                    "type": "child_run_created",
                    "child_run_id": f"{agent_name}-run",
                    "agent_name": agent_name,
                },
            )
            yield StreamEvent(
                type="custom",
                data={
                    "type": "child_run_completed",
                    "child_run_id": f"{agent_name}-run",
                    "result": f"{agent_name}-done",
                },
            )
            yield StreamEvent(
                type="custom",
                data={
                    "type": "child_run_closed",
                    "child_run_id": f"{agent_name}-run",
                },
            )

    graph = build_agent_orchestrator_graph(
        checkpointer=InMemorySaver(),
        delegated_executor=FakeExecutor(),
        agent_resolver=lambda _name: object(),
    )
    config = {"configurable": {"thread_id": "thread-1"}}

    first = graph.invoke(
        {
            "user_text": "@research-agent 搜索资料，交给 @writer-agent 总结",
            "thread_id": "thread-1",
        },
        config=config,
    )
    second = graph.invoke(
        {
            "user_text": "@formatter-agent 输出 HTML",
            "thread_id": "thread-1",
        },
        config=config,
    )

    assert first["child_work_products"] == [
        {"agent_name": "research-agent", "result": "research-agent-done"},
        {"agent_name": "writer-agent", "result": "writer-agent-done"},
    ]
    assert second["child_work_products"] == [
        {"agent_name": "formatter-agent", "result": "formatter-agent-done"},
    ]
    assert first["final_reply"] == ""
    assert second["final_reply"] == ""
