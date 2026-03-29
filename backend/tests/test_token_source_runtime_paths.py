"""Focused tests for lead-agent and subagent token source contexts."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from nion.client import NionClient
from nion.telemetry.token_source import get_current_token_source


@pytest.fixture
def mock_app_config():
    model = MagicMock()
    model.name = "test-model"
    model.model = "test-model"
    model.supports_thinking = False
    model.supports_reasoning_effort = False
    model.model_dump.return_value = {"name": "test-model", "use": "langchain_openai:ChatOpenAI"}

    config = MagicMock()
    config.models = [model]
    return config


def test_nion_client_stream_uses_lead_agent_source(mock_app_config):
    with patch("nion.client.get_app_config", return_value=mock_app_config):
        client = NionClient()

    ai = AIMessage(content="Hello!", id="ai-1")

    class FakeAgent:
        def stream(self, *args, **kwargs):
            assert get_current_token_source() == "lead_agent"
            yield {"messages": [HumanMessage(content="hi", id="h-1"), ai]}

    with patch.object(client, "_ensure_agent"), patch.object(client, "_agent", FakeAgent()):
        events = list(client.stream("hi", thread_id="t1"))

    assert events[-1].type == "end"


_MOCKED_MODULE_NAMES = [
    "nion.agents",
    "nion.agents.thread_state",
    "nion.agents.middlewares",
    "nion.agents.middlewares.thread_data_middleware",
    "nion.sandbox",
    "nion.sandbox.middleware",
    "nion.models",
]


@pytest.fixture(scope="session", autouse=True)
def _setup_executor_classes():
    import sys

    original_modules = {name: sys.modules.get(name) for name in _MOCKED_MODULE_NAMES}
    original_executor = sys.modules.get("nion.subagents.executor")

    if "nion.subagents.executor" in sys.modules:
        del sys.modules["nion.subagents.executor"]

    for name in _MOCKED_MODULE_NAMES:
        sys.modules[name] = MagicMock()

    from langchain_core.messages import AIMessage as RealAIMessage
    from langchain_core.messages import HumanMessage as RealHumanMessage

    from nion.subagents.config import SubagentConfig
    from nion.subagents.executor import SubagentExecutor

    classes = {
        "AIMessage": RealAIMessage,
        "HumanMessage": RealHumanMessage,
        "SubagentConfig": SubagentConfig,
        "SubagentExecutor": SubagentExecutor,
    }

    yield classes

    for name in _MOCKED_MODULE_NAMES:
        if original_modules[name] is not None:
            sys.modules[name] = original_modules[name]
        elif name in sys.modules:
            del sys.modules[name]

    if original_executor is not None:
        sys.modules["nion.subagents.executor"] = original_executor
    elif "nion.subagents.executor" in sys.modules:
        del sys.modules["nion.subagents.executor"]


@pytest.fixture
def classes(_setup_executor_classes):
    return _setup_executor_classes


@pytest.fixture
def base_config(classes):
    return classes["SubagentConfig"](
        name="test-agent",
        description="Test agent",
        system_prompt="You are a test agent.",
        max_turns=10,
        timeout_seconds=60,
    )


class _MsgHelper:
    def __init__(self, classes):
        self.classes = classes

    def human(self, content):
        return self.classes["HumanMessage"](content=content)

    def ai(self, content, msg_id=None):
        msg = self.classes["AIMessage"](content=content)
        if msg_id:
            msg.id = msg_id
        return msg


@pytest.fixture
def msg(classes):
    return _MsgHelper(classes)


@pytest.mark.anyio
async def test_subagent_executor_astream_uses_subagent_source(classes, base_config, msg):
    SubagentExecutor = classes["SubagentExecutor"]

    async def fake_astream(*args, **kwargs):
        assert get_current_token_source() == "subagent"
        yield {"messages": [msg.human("Task"), msg.ai("Done", "msg-1")]}

    fake_agent = MagicMock()
    fake_agent.astream = fake_astream

    executor = SubagentExecutor(
        config=base_config,
        tools=[],
        thread_id="test-thread",
    )

    with patch.object(executor, "_create_agent", return_value=fake_agent):
        result = await executor._aexecute("Task")

    assert result.result == "Done"
