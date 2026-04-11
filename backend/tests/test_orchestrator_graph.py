from langgraph.checkpoint.memory import InMemorySaver

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
