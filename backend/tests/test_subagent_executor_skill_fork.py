from types import SimpleNamespace

from nion.subagents.config import SubagentConfig
from nion.subagents import executor as executor_module
from nion.subagents.executor import SubagentExecutor


def test_subagent_executor_applies_fork_skill_runtime(monkeypatch):
    config = SubagentConfig(
        name="general-purpose",
        description="General helper",
        system_prompt="Base prompt",
        max_turns=50,
        timeout_seconds=10,
    )

    captured = {}

    monkeypatch.setattr(
        executor_module,
        "create_chat_model",
        lambda name, thinking_enabled=False, **kwargs: captured.setdefault(
            "model",
            {"name": name, "thinking_enabled": thinking_enabled, **kwargs},
        ),
    )
    monkeypatch.setattr(
        executor_module,
        "create_agent",
        lambda **kwargs: captured.setdefault("agent_kwargs", kwargs) or SimpleNamespace(),
    )

    executor = SubagentExecutor(
        config=config,
        tools=[],
        parent_model="base-model",
        active_skill={
            "name": "planner",
            "context": "fork",
            "model": "gpt-5.2",
            "effort": "high",
            "activation_content": "follow planner steps",
        },
    )

    executor._create_agent()

    assert captured["model"]["name"] == "gpt-5.2"
    assert "follow planner steps" in captured["agent_kwargs"]["system_prompt"]
