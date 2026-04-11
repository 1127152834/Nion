from __future__ import annotations

from langgraph.checkpoint.memory import InMemorySaver

from nion.orchestration.graph import build_agent_orchestrator_graph


def test_orchestrator_graph_short_circuits_when_no_mentions() -> None:
    graph = build_agent_orchestrator_graph(checkpointer=InMemorySaver())

    result = graph.invoke({"user_text": "普通单智能体问题", "thread_id": "thread-1"})

    assert result["mode"] == "lead_only"
