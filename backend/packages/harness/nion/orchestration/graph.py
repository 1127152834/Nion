from __future__ import annotations

from typing import Annotated, Any, Callable, TypedDict

from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph

from nion.orchestration.mention_parser import MentionedAgentStep, parse_agent_mentions


class OrchestrationState(TypedDict, total=False):
    thread_id: str
    user_text: str
    mode: str
    mention_steps: list[dict[str, Any]]
    current_index: int
    child_results: list[dict[str, str]]
    child_work_products: list[dict[str, str]]
    final_reply: str


def _default_summary_builder(
    *,
    original_request: str,
    child_results: list[tuple[str, str]],
) -> str:
    if not child_results:
        return "已识别到子智能体调度请求，但没有可汇总的子智能体结果。"

    sections = "\n\n".join(
        f"### @{agent_name}\n{result}" for agent_name, result in child_results
    )
    return (
        f"已按主智能体编排完成请求：{original_request}\n\n"
        "以下是各子智能体回传的结果汇总：\n\n"
        f"{sections}"
    )


def _build_delegated_agent_prompt(
    *,
    original_request: str,
    child_results: list[tuple[str, str]],
) -> str:
    if not child_results:
        return original_request

    upstream = "\n\n".join(
        f"@{agent_name} 的上游结果：\n{result}"
        for agent_name, result in child_results
    )
    return (
        f"原始请求：\n{original_request}\n\n"
        "你正在执行一个主智能体编排链中的后续步骤。请基于以下上游结果继续完成你的部分：\n\n"
        f"{upstream}"
    )


def build_agent_orchestrator_graph(
    *,
    checkpointer,
    delegated_executor,
    agent_resolver: Callable[[str], Any | None],
    caller_permissions: set[str] | None = None,
    summary_builder: Callable[[str, list[tuple[str, str]]], str] | None = None,
):
    summary_fn = summary_builder or (
        lambda original_request, child_results: _default_summary_builder(
            original_request=original_request,
            child_results=child_results,
        )
    )

    def parse_mentions_node(state: OrchestrationState):
        parsed_steps: list[MentionedAgentStep] = parse_agent_mentions(state["user_text"])
        steps = [
            step.model_dump()
            for step in parsed_steps
            if agent_resolver(step.agent_name) is not None
        ]
        return {
            "mention_steps": steps,
            "mode": "delegated" if steps else "lead_only",
            "current_index": 0,
            "child_results": [],
            "child_work_products": [],
        }

    def plan_agent_chain_node(state: OrchestrationState):
        return state

    def dispatch_child_runs(state: OrchestrationState):
        if state.get("mode") != "delegated":
            return "synthesize"
        return "run_child_agent"

    def run_child_agent(state: dict[str, Any]):
        writer = get_stream_writer()
        latest_result = ""
        current_index = int(state.get("current_index", 0))
        step = state["mention_steps"][current_index]
        prior_results = [
            (item["agent_name"], item["result"])
            for item in state.get("child_results", [])
            if isinstance(item, dict)
            and isinstance(item.get("agent_name"), str)
            and isinstance(item.get("result"), str)
        ]
        delegated_prompt = _build_delegated_agent_prompt(
            original_request=step.get("instruction") or state["user_text"],
            child_results=prior_results,
        )
        for event in delegated_executor.stream(
            parent_thread_id=state["thread_id"],
            agent_name=step["agent_name"],
            prompt=delegated_prompt,
            caller_permissions=caller_permissions,
        ):
            if event.type == "custom":
                writer(event.data)
                if (
                    event.data.get("type") == "child_run_completed"
                    and isinstance(event.data.get("result"), str)
                ):
                    latest_result = event.data["result"]
        return {
            "child_results": [
                *state.get("child_results", []),
                {
                    "agent_name": step["agent_name"],
                    "result": latest_result,
                },
            ],
            "child_work_products": [
                *state.get("child_work_products", []),
                {
                    "agent_name": step["agent_name"],
                    "result": latest_result,
                },
            ],
            "current_index": current_index + 1,
        }

    def route_after_child_run(state: OrchestrationState):
        if int(state.get("current_index", 0)) < len(state.get("mention_steps", [])):
            return "run_child_agent"
        return "synthesize"

    def synthesize_node(state: OrchestrationState):
        if state.get("mode") == "lead_only":
            return {"final_reply": "", "mode": "lead_only", "child_work_products": []}
        return {
            "final_reply": "",
            "mode": "delegated",
            "child_work_products": state.get("child_work_products", []),
        }

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
    builder.add_conditional_edges(
        "run_child_agent",
        route_after_child_run,
        ["run_child_agent", "synthesize"],
    )
    builder.add_edge("synthesize", END)
    return builder.compile(checkpointer=checkpointer)
