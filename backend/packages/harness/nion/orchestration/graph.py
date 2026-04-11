from __future__ import annotations

import operator
from typing import Annotated, Literal
from typing_extensions import TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from nion.orchestration.mention_parser import parse_agent_mentions


class OrchestrationState(TypedDict, total=False):
    thread_id: str
    user_text: str
    mode: Literal["lead_only", "delegated"]
    mention_steps: list[dict[str, object]]
    child_results: Annotated[list[str], operator.add]
    final_reply: str


def parse_mentions_node(state: OrchestrationState) -> OrchestrationState:
    steps = [step.model_dump() for step in parse_agent_mentions(state["user_text"])]
    return {
        "mention_steps": steps,
        "mode": "delegated" if steps else "lead_only",
    }


def plan_agent_chain_node(state: OrchestrationState) -> OrchestrationState:
    return state


def dispatch_child_runs(state: OrchestrationState):
    if state.get("mode") != "delegated":
        return "synthesize"
    return [
        Send(
            "run_child_agent",
            {
                "thread_id": state["thread_id"],
                "step": step,
            },
        )
        for step in state.get("mention_steps", [])
    ]


def run_child_agent(state: dict[str, object]) -> OrchestrationState:
    step = state["step"]
    if not isinstance(step, dict):
        return {"child_results": []}
    agent_name = step.get("agent_name")
    return {"child_results": [str(agent_name)] if isinstance(agent_name, str) else []}


def synthesize_node(state: OrchestrationState) -> OrchestrationState:
    if state.get("mode") == "lead_only":
        return {"mode": "lead_only", "final_reply": ""}
    return {
        "mode": "delegated",
        "final_reply": "delegated:" + ",".join(state.get("child_results", [])),
    }


def build_agent_orchestrator_graph(*, checkpointer):
    builder = StateGraph(OrchestrationState)
    builder.add_node("parse_mentions", parse_mentions_node)
    builder.add_node("plan_agent_chain", plan_agent_chain_node)
    builder.add_node("run_child_agent", run_child_agent)
    builder.add_node("synthesize", synthesize_node)
    builder.add_edge(START, "parse_mentions")
    builder.add_edge("parse_mentions", "plan_agent_chain")
    builder.add_conditional_edges(
        "plan_agent_chain",
        dispatch_child_runs,
        ["run_child_agent", "synthesize"],
    )
    builder.add_edge("run_child_agent", "synthesize")
    builder.add_edge("synthesize", END)
    _ = checkpointer
    return builder.compile()
