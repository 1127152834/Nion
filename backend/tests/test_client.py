"""Tests for NionClient."""

import asyncio
import concurrent.futures
import json
import tempfile
import zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, ToolMessage  # noqa: F401

from app.gateway.routers.mcp import McpConfigResponse
from app.gateway.routers.memory import MemoryConfigResponse, MemoryStatusResponse
from app.gateway.routers.models import ModelResponse, ModelsListResponse
from app.gateway.routers.skills import SkillInstallResponse, SkillResponse, SkillsListResponse
from app.gateway.routers.uploads import UploadResponse
from nion.agents.lead_agent import agent as lead_agent_module
from nion.agents.middlewares.locale_aware_summarization import (
    LocaleAwareSummarizationMiddleware,
)
from nion.client import NionClient
from nion.config.summarization_config import ContextSize, SummarizationConfig

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_app_config():
    """Provide a minimal AppConfig mock."""
    config = MagicMock()
    return config


@pytest.fixture
def client(mock_app_config):
    """Create a NionClient with mocked config loading."""
    with patch("nion.client.get_app_config", return_value=mock_app_config):
        return NionClient()


# ---------------------------------------------------------------------------
# __init__
# ---------------------------------------------------------------------------


class TestClientInit:
    def test_default_params(self, client):
        assert client._model_name is None
        assert client._thinking_enabled is True
        assert client._subagent_enabled is False
        assert client._plan_mode is False
        assert client._agent_name is None
        assert client._checkpointer is None
        assert client._agent is None

    def test_custom_params(self, mock_app_config):
        with patch("nion.client.get_app_config", return_value=mock_app_config):
            c = NionClient(
                model_name="gpt-4",
                thinking_enabled=False,
                subagent_enabled=True,
                plan_mode=True,
                agent_name="test-agent"
            )
        assert c._model_name == "gpt-4"
        assert c._thinking_enabled is False
        assert c._subagent_enabled is True
        assert c._plan_mode is True
        assert c._agent_name == "test-agent"

    def test_invalid_agent_name(self, mock_app_config):
        with patch("nion.client.get_app_config", return_value=mock_app_config):
            with pytest.raises(ValueError, match="Invalid agent name"):
                NionClient(agent_name="invalid name with spaces!")
            with pytest.raises(ValueError, match="Invalid agent name"):
                NionClient(agent_name="../path/traversal")

    def test_checkpointer_stored(self, mock_app_config):
        cp = MagicMock()
        with patch("nion.client.get_app_config", return_value=mock_app_config):
            c = NionClient(checkpointer=cp)
        assert c._checkpointer is cp


# ---------------------------------------------------------------------------
# list_models / list_skills / get_memory
# ---------------------------------------------------------------------------


class TestConfigQueries:
    def test_list_models(self, client):
        runtime_model = MagicMock()
        runtime_model.runtime_name = "test-model"
        runtime_model.model.model_id = "gpt-test"
        runtime_model.model.display_name = "Test Model"
        runtime_model.runtime_model_config.description = "A test model"
        runtime_model.runtime_model_config.supports_thinking = False
        runtime_model.runtime_model_config.supports_reasoning_effort = False
        runtime_model.runtime_model_config.supports_vision = False

        with patch("nion.client.get_model_registry_service") as mock_service:
            mock_service.return_value.list_runtime_models.return_value = [runtime_model]
            result = client.list_models()

        assert "models" in result
        assert len(result["models"]) == 1
        assert result["models"][0]["name"] == "test-model"
        # Verify Gateway-aligned fields are present
        assert "model" in result["models"][0]
        assert "display_name" in result["models"][0]
        assert "supports_thinking" in result["models"][0]

    def test_list_skills(self, client):
        skill = MagicMock()
        skill.skill_path = "web-search"
        skill.name = "web-search"
        skill.description = "Search the web"
        skill.license = "MIT"
        skill.category = "public"
        skill.enabled = True

        with patch("nion.skills.loader.load_skills", return_value=[skill]) as mock_load:
            result = client.list_skills()
            mock_load.assert_called_once_with(enabled_only=False)

        assert "skills" in result
        assert len(result["skills"]) == 1
        assert result["skills"][0] == {
            "id": "public:web-search",
            "name": "web-search",
            "description": "Search the web",
            "license": "MIT",
            "category": "public",
            "enabled": True,
        }

    def test_list_skills_enabled_only(self, client):
        with patch("nion.skills.loader.load_skills", return_value=[]) as mock_load:
            client.list_skills(enabled_only=True)
            mock_load.assert_called_once_with(enabled_only=True)

    def test_get_memory(self, client):
        memory = {"version": "2.0", "facts": []}
        with patch("nion.memory_os.compat.build_canonical_memory_payload", return_value=memory) as mock_get:
            result = client.get_memory()
            mock_get.assert_called_once()
        assert result == memory

    def test_clear_memory(self, client):
        memory = {"version": "1.0", "facts": []}
        with patch("nion.memory_os.compat.clear_memory_os_memory", return_value=memory) as mock_clear:
            result = client.clear_memory()
            mock_clear.assert_called_once()
        assert result == memory

    def test_delete_memory_fact(self, client):
        memory = {"version": "1.0", "facts": [{"id": "fact_keep"}]}
        with patch(
            "nion.memory_os.compat.delete_memory_os_fact",
            return_value=memory,
        ) as mock_delete:
            result = client.delete_memory_fact("fact_delete")
            mock_delete.assert_called_once_with("fact_delete")
        assert result == memory

    def test_export_memory(self, client):
        memory = {"version": "1.0", "facts": []}
        with patch("nion.memory_os.compat.build_legacy_memory_view", return_value=memory) as mock_get:
            result = client.export_memory()
            mock_get.assert_called_once()
        assert result == memory

    def test_import_memory(self, client):
        memory = {"version": "1.0", "facts": []}
        with patch("nion.memory_os.compat.import_legacy_memory_into_memory_os", return_value=memory) as mock_import:
            result = client.import_memory(memory)
            mock_import.assert_called_once_with(memory)
        assert result == memory

    def test_create_memory_fact(self, client):
        memory = {"version": "1.0", "facts": [{"id": "fact_new"}]}
        with patch("nion.memory_os.compat.create_memory_os_fact", return_value=memory) as mock_create:
            result = client.create_memory_fact("hello", category="context", confidence=0.8)
            mock_create.assert_called_once_with(content="hello", category="context", confidence=0.8)
        assert result == memory

    def test_update_memory_fact(self, client):
        memory = {"version": "1.0", "facts": [{"id": "fact_edit"}]}
        with patch("nion.memory_os.compat.update_memory_os_fact", return_value=memory) as mock_update:
            result = client.update_memory_fact("fact_edit", content="updated")
            mock_update.assert_called_once_with(
                fact_id="fact_edit",
                content="updated",
                category=None,
                confidence=None,
            )
        assert result == memory


# ---------------------------------------------------------------------------
# stream / chat
# ---------------------------------------------------------------------------


def _make_agent_mock(chunks: list[dict]):
    """Create a mock agent whose .stream() yields the given chunks."""
    agent = MagicMock()
    agent.stream.return_value = iter(chunks)
    return agent


def _ai_events(events):
    """Filter messages-tuple events with type=ai and non-empty content."""
    return [e for e in events if e.type == "messages-tuple" and e.data.get("type") == "ai" and e.data.get("content")]


def _tool_call_events(events):
    """Filter messages-tuple events with type=ai and tool_calls."""
    return [e for e in events if e.type == "messages-tuple" and e.data.get("type") == "ai" and "tool_calls" in e.data]


def _tool_result_events(events):
    """Filter messages-tuple events with type=tool."""
    return [e for e in events if e.type == "messages-tuple" and e.data.get("type") == "tool"]


def _custom_events(events):
    return [e for e in events if e.type == "custom"]


class TestStream:
    def test_stream_uses_request_agent_name_for_embedded_agent_identity(self, client):
        ai = AIMessage(content="Hello!", id="ai-1")
        chunks = [
            {"messages": [HumanMessage(content="hi", id="h-1")]},
            {"messages": [HumanMessage(content="hi", id="h-1"), ai]},
        ]
        config = client._get_runnable_config(
            "t1",
            agent_name="notebook-chat",
            notebook_context={"note_id": "note-1", "note_body": "hello"},
        )

        assert config["configurable"]["agent_name"] == "notebook-chat"
        assert config["configurable"]["notebook_context"] == {
            "note_id": "note-1",
            "note_body": "hello",
        }

    def test_get_runnable_config_includes_locale(self, client):
        config = client._get_runnable_config("t1", locale="zh-CN")

        assert config["configurable"]["locale"] == "zh-CN"

    def test_build_agent_config_key_ignores_locale(self, client):
        config_a = client._get_runnable_config("t1", locale="zh-CN")
        config_b = client._get_runnable_config("t1", locale="en-US")

        assert (
            client._build_agent_config_key(config_a["configurable"])
            == client._build_agent_config_key(config_b["configurable"])
        )

    def test_basic_message(self, client):
        """stream() emits messages-tuple + values + end for a simple AI reply."""
        ai = AIMessage(content="Hello!", id="ai-1")
        chunks = [
            {"messages": [HumanMessage(content="hi", id="h-1")]},
            {"messages": [HumanMessage(content="hi", id="h-1"), ai]},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t1"))

        types = [e.type for e in events]
        assert "messages-tuple" in types
        assert "values" in types
        assert types[-1] == "end"
        msg_events = _ai_events(events)
        assert msg_events[0].data["content"] == "Hello!"

    def test_custom_events_are_forwarded(self, client):
        """stream() forwards custom graph events alongside normal values output."""
        ai = AIMessage(content="Hello!", id="ai-1")
        agent = MagicMock()
        agent.stream.return_value = iter(
            [
                ("custom", {"type": "task_started", "task_id": "task-1"}),
                ("values", {"messages": [HumanMessage(content="hi", id="h-1"), ai]}),
            ]
        )

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t-custom"))

        call_kwargs = agent.stream.call_args.kwargs
        assert call_kwargs["stream_mode"] == ["values", "messages", "custom"]
        assert events[0].type == "custom"
        assert events[0].data == {"type": "task_started", "task_id": "task-1"}
        assert any(
            event.type == "messages-tuple" and event.data["content"] == "Hello!"
            for event in events
        )

    def test_context_propagation(self, client):
        """stream() passes agent_name to the context."""
        agent = _make_agent_mock([{"messages": [AIMessage(content="ok", id="ai-1")]}])

        client._agent_name = "test-agent-1"
        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            list(client.stream("hi", thread_id="t1"))
        
        # Verify context passed to agent.stream
        agent.stream.assert_called_once()
        call_kwargs = agent.stream.call_args.kwargs
        assert call_kwargs["context"]["thread_id"] == "t1"
        assert call_kwargs["context"]["agent_name"] == "test-agent-1"

    def test_stream_passes_locale_into_agent_runtime_context(self, client):
        agent = _make_agent_mock([{"messages": [AIMessage(content="ok", id="ai-1")]}])

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            list(client.stream("hi", thread_id="t-locale", locale="zh-CN"))

        agent.stream.assert_called_once()
        call_kwargs = agent.stream.call_args.kwargs
        assert call_kwargs["context"]["locale"] == "zh-CN"

    def test_tool_call_and_result(self, client):
        """stream() emits messages-tuple events for tool calls and results."""
        ai = AIMessage(content="", id="ai-1", tool_calls=[{"name": "bash", "args": {"cmd": "ls"}, "id": "tc-1"}])
        tool = ToolMessage(content="file.txt", id="tm-1", tool_call_id="tc-1", name="bash")
        ai2 = AIMessage(content="Here are the files.", id="ai-2")

        chunks = [
            {"messages": [HumanMessage(content="list files", id="h-1"), ai]},
            {"messages": [HumanMessage(content="list files", id="h-1"), ai, tool]},
            {"messages": [HumanMessage(content="list files", id="h-1"), ai, tool, ai2]},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("list files", thread_id="t2"))

        assert len(_tool_call_events(events)) >= 1
        assert len(_tool_result_events(events)) >= 1
        assert len(_ai_events(events)) >= 1
        assert events[-1].type == "end"

    def test_knowledge_tool_result_attaches_page_ids_to_final_answer(self, client):
        ai_lookup = AIMessage(
            content="",
            id="ai-knowledge-tool-call",
            tool_calls=[
                {
                    "name": "query_knowledge_base",
                    "args": {"question": "roadmap"},
                    "id": "tc-knowledge",
                }
            ],
        )
        tool_result = ToolMessage(
            content='{"answer_markdown":"Roadmap summary","page_ids":["concept:roadmap"]}',
            id="tm-knowledge",
            tool_call_id="tc-knowledge",
            name="query_knowledge_base",
        )
        ai_final = AIMessage(content="Roadmap summary", id="ai-knowledge-final")
        chunks = [
            {"messages": [HumanMessage(content="知识库 roadmap", id="h-1"), ai_lookup]},
            {"messages": [HumanMessage(content="知识库 roadmap", id="h-1"), ai_lookup, tool_result]},
            {"messages": [HumanMessage(content="知识库 roadmap", id="h-1"), ai_lookup, tool_result, ai_final]},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("知识库 roadmap", thread_id="t-knowledge"))

        final_events = [
            event
            for event in events
            if event.type == "messages-tuple"
            and event.data.get("type") == "ai"
            and event.data.get("content") == "Roadmap summary"
        ]
        assert final_events
        assert final_events[-1].data["additional_kwargs"]["knowledge_sources"] == [
            "concept:roadmap"
        ]

    def test_values_event_with_title(self, client):
        """stream() emits values event containing title when present in state."""
        ai = AIMessage(content="ok", id="ai-1")
        chunks = [
            {"messages": [HumanMessage(content="hi", id="h-1"), ai], "title": "Greeting"},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t3"))

        values_events = [e for e in events if e.type == "values"]
        assert len(values_events) >= 1
        assert values_events[-1].data["title"] == "Greeting"
        assert "messages" in values_events[-1].data

    def test_clarification_tool_emits_custom_event(self, client):
        tool = ToolMessage(
            content="❓ Which option do you want?",
            id="tm-clarify",
            tool_call_id="tc-clarify",
            name="ask_clarification",
            additional_kwargs={
                "clarification": {
                    "question": "Which option do you want?",
                    "clarification_type": "approach_choice",
                    "options": ["A", "B"],
                }
            },
        )
        chunks = [
            {"messages": [HumanMessage(content="choose", id="h-1"), tool]},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("choose", thread_id="t-clarify"))

        custom_events = _custom_events(events)
        assert len(custom_events) == 1
        assert custom_events[0].data["type"] == "clarification_request"
        assert custom_events[0].data["question"] == "Which option do you want?"
        assert custom_events[0].data["options"] == ["A", "B"]

    def test_deduplication(self, client):
        """Messages with the same id are not emitted twice."""
        ai = AIMessage(content="Hello!", id="ai-1")
        chunks = [
            {"messages": [HumanMessage(content="hi", id="h-1"), ai]},
            {"messages": [HumanMessage(content="hi", id="h-1"), ai]},  # duplicate
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t4"))

        msg_events = _ai_events(events)
        assert len(msg_events) == 1

    def test_same_id_ai_updates_are_reemitted_when_content_changes(self, client):
        """Streaming updates with the same id should still surface when content changes."""
        ai_partial = AIMessage(content="Hel", id="ai-1")
        ai_full = AIMessage(content="Hello!", id="ai-1")
        chunks = [
            {"messages": [HumanMessage(content="hi", id="h-1"), ai_partial]},
            {"messages": [HumanMessage(content="hi", id="h-1"), ai_full]},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t4-stream"))

        msg_events = _ai_events(events)
        assert [event.data["content"] for event in msg_events] == ["Hel", "Hello!"]

    def test_messages_stream_chunks_are_emitted_incrementally(self, client):
        chunks = [
            ("messages", (AIMessageChunk(content="Hel", id="ai-1"), {"langgraph_node": "model"})),
            ("messages", (AIMessageChunk(content="lo", id="ai-1"), {"langgraph_node": "model"})),
            {"messages": [HumanMessage(content="hi", id="h-1"), AIMessage(content="Hello", id="ai-1")]},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t4-chunks"))

        msg_events = _ai_events(events)
        assert [event.data["content"] for event in msg_events[:2]] == ["Hel", "Hello"]

    def test_auto_thread_id(self, client):
        """stream() auto-generates a thread_id if not provided."""
        agent = _make_agent_mock([{"messages": [AIMessage(content="ok", id="ai-1")]}])

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi"))

        # Should not raise; end event proves it completed
        assert events[-1].type == "end"

    def test_list_content_blocks(self, client):
        """stream() handles AIMessage with list-of-blocks content."""
        ai = AIMessage(
            content=[
                {"type": "thinking", "thinking": "hmm"},
                {"type": "text", "text": "result"},
            ],
            id="ai-1",
        )
        chunks = [{"messages": [ai]}]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t5"))

        msg_events = _ai_events(events)
        assert len(msg_events) == 1
        assert msg_events[0].data["content"] == "result"


class TestChat:
    def test_returns_last_message(self, client):
        """chat() returns the last AI message text."""
        ai1 = AIMessage(content="thinking...", id="ai-1")
        ai2 = AIMessage(content="final answer", id="ai-2")
        chunks = [
            {"messages": [HumanMessage(content="q", id="h-1"), ai1]},
            {"messages": [HumanMessage(content="q", id="h-1"), ai1, ai2]},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            result = client.chat("q", thread_id="t6")

        assert result == "final answer"

    def test_empty_response(self, client):
        """chat() returns empty string if no AI message produced."""
        chunks = [{"messages": []}]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            result = client.chat("q", thread_id="t7")

        assert result == ""


# ---------------------------------------------------------------------------
# _extract_text
# ---------------------------------------------------------------------------


class TestExtractText:
    def test_string(self):
        assert NionClient._extract_text("hello") == "hello"

    def test_list_text_blocks(self):
        content = [
            {"type": "text", "text": "first"},
            {"type": "thinking", "thinking": "skip"},
            {"type": "text", "text": "second"},
        ]
        assert NionClient._extract_text(content) == "first\nsecond"

    def test_list_plain_strings(self):
        assert NionClient._extract_text(["a", "b"]) == "a\nb"

    def test_empty_list(self):
        assert NionClient._extract_text([]) == ""

    def test_other_type(self):
        assert NionClient._extract_text(42) == "42"


# ---------------------------------------------------------------------------
# _ensure_agent
# ---------------------------------------------------------------------------


class TestEnsureAgent:
    def test_creates_agent(self, client):
        """_ensure_agent creates an agent on first call."""
        mock_agent = MagicMock()
        config = client._get_runnable_config("t1")

        with (
            patch("nion.client.create_chat_model"),
            patch("nion.client.create_agent", return_value=mock_agent),
            patch("nion.client._build_middlewares", return_value=[]) as mock_build_middlewares,
            patch("nion.client.apply_prompt_template", return_value="prompt") as mock_apply_prompt,
            patch.object(client, "_get_tools", return_value=[]),
        ):
            client._agent_name = "custom-agent"
            client._ensure_agent(config)

        assert client._agent is mock_agent
        # Verify agent_name propagation
        mock_build_middlewares.assert_called_once()
        assert mock_build_middlewares.call_args.kwargs.get("agent_name") == "custom-agent"
        mock_apply_prompt.assert_called_once()
        assert mock_apply_prompt.call_args.kwargs.get("agent_name") == "custom-agent"

    def test_uses_default_checkpointer_when_available(self, client):
        mock_agent = MagicMock()
        mock_checkpointer = MagicMock()
        config = client._get_runnable_config("t1")

        with (
            patch("nion.client.create_chat_model"),
            patch("nion.client.create_agent", return_value=mock_agent) as mock_create_agent,
            patch("nion.client._build_middlewares", return_value=[]),
            patch("nion.client.apply_prompt_template", return_value="prompt"),
            patch.object(client, "_get_tools", return_value=[]),
            patch("nion.agents.checkpointer.get_checkpointer", return_value=mock_checkpointer),
        ):
            client._ensure_agent(config)

        assert mock_create_agent.call_args.kwargs["checkpointer"] is mock_checkpointer

    def test_skips_default_checkpointer_when_unconfigured(self, client):
        mock_agent = MagicMock()
        config = client._get_runnable_config("t1")

        with (
            patch("nion.client.create_chat_model"),
            patch("nion.client.create_agent", return_value=mock_agent) as mock_create_agent,
            patch("nion.client._build_middlewares", return_value=[]),
            patch("nion.client.apply_prompt_template", return_value="prompt"),
            patch.object(client, "_get_tools", return_value=[]),
            patch("nion.agents.checkpointer.get_checkpointer", return_value=None),
        ):
            client._ensure_agent(config)

        assert "checkpointer" not in mock_create_agent.call_args.kwargs

    def test_reuses_agent_same_config(self, client):
        """_ensure_agent does not recreate if config key unchanged."""
        mock_agent = MagicMock()
        client._agent = mock_agent
        config = client._get_runnable_config("t1")
        client._agent_config_key = client._build_agent_config_key(config["configurable"])
        client._ensure_agent(config)

        # Should still be the same mock — no recreation
        assert client._agent is mock_agent


# ---------------------------------------------------------------------------
# get_model
# ---------------------------------------------------------------------------


class TestGetModel:
    def test_found(self, client):
        resolved = MagicMock()
        resolved.runtime_name = "test-model"
        resolved.model.model_id = "test-model"
        resolved.model.display_name = "Test Model"
        resolved.runtime_model_config.description = "A test model"
        resolved.runtime_model_config.supports_thinking = True
        resolved.runtime_model_config.supports_reasoning_effort = True
        resolved.runtime_model_config.supports_vision = False
        registry = MagicMock()
        registry.resolve_model.return_value = resolved

        with patch("nion.client.get_model_registry_service", return_value=registry):
            result = client.get_model("test-model")

        assert result == {
            "name": "test-model",
            "model": "test-model",
            "display_name": "Test Model",
            "description": "A test model",
            "supports_thinking": True,
            "supports_reasoning_effort": True,
            "supports_vision": False,
        }

    def test_not_found(self, client):
        registry = MagicMock()
        registry.resolve_model.side_effect = ValueError("missing")

        with patch("nion.client.get_model_registry_service", return_value=registry):
            assert client.get_model("nonexistent") is None


# ---------------------------------------------------------------------------
# MCP config
# ---------------------------------------------------------------------------


class TestMcpConfig:
    def test_get_mcp_config(self, client):
        server = MagicMock()
        server.model_dump.return_value = {"enabled": True, "type": "stdio"}
        ext_config = MagicMock()
        ext_config.mcp_servers = {"github": server}

        with patch("nion.client.get_extensions_config", return_value=ext_config):
            result = client.get_mcp_config()

        assert "mcp_servers" in result
        assert "github" in result["mcp_servers"]
        assert result["mcp_servers"]["github"]["enabled"] is True

    def test_update_mcp_config(self, client):
        # Set up current config with skills
        current_config = MagicMock()
        current_config.skills = {}

        reloaded_server = MagicMock()
        reloaded_server.model_dump.return_value = {"enabled": True, "type": "sse"}
        reloaded_config = MagicMock()
        reloaded_config.mcp_servers = {"new-server": reloaded_server}

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump({}, f)
            tmp_path = Path(f.name)

        try:
            # Pre-set agent to verify it gets invalidated
            client._agent = MagicMock()

            with (
                patch("nion.client.ExtensionsConfig.resolve_config_path", return_value=tmp_path),
                patch("nion.client.get_extensions_config", return_value=current_config),
                patch("nion.client.reload_extensions_config", return_value=reloaded_config),
            ):
                result = client.update_mcp_config({"new-server": {"enabled": True, "type": "sse"}})

            assert "mcp_servers" in result
            assert "new-server" in result["mcp_servers"]
            assert client._agent is None  # M2: agent invalidated

            # Verify file was actually written
            with open(tmp_path) as f:
                saved = json.load(f)
            assert "mcpServers" in saved
        finally:
            tmp_path.unlink()


# ---------------------------------------------------------------------------
# Skills management
# ---------------------------------------------------------------------------


class TestSkillsManagement:
    def _make_skill(self, name="test-skill", enabled=True):
        s = MagicMock()
        s.name = name
        s.description = "A test skill"
        s.license = "MIT"
        s.category = "public"
        s.enabled = enabled
        return s

    def test_get_skill_found(self, client):
        skill = self._make_skill()
        with patch("nion.skills.loader.load_skills", return_value=[skill]):
            result = client.get_skill("test-skill")
        assert result is not None
        assert result["name"] == "test-skill"

    def test_get_skill_not_found(self, client):
        with patch("nion.skills.loader.load_skills", return_value=[]):
            result = client.get_skill("nonexistent")
        assert result is None

    def test_update_skill(self, client):
        skill = self._make_skill(enabled=True)
        updated_skill = self._make_skill(enabled=False)

        ext_config = MagicMock()
        ext_config.mcp_servers = {}
        ext_config.skills = {}

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump({}, f)
            tmp_path = Path(f.name)

        try:
            # Pre-set agent to verify it gets invalidated
            client._agent = MagicMock()

            with (
                patch("nion.skills.loader.load_skills", side_effect=[[skill], [updated_skill]]),
                patch("nion.client.ExtensionsConfig.resolve_config_path", return_value=tmp_path),
                patch("nion.client.get_extensions_config", return_value=ext_config),
                patch("nion.client.reload_extensions_config"),
            ):
                result = client.update_skill("test-skill", enabled=False)
            assert result["enabled"] is False
            assert client._agent is None  # M2: agent invalidated
        finally:
            tmp_path.unlink()

    def test_update_skill_not_found(self, client):
        with patch("nion.skills.loader.load_skills", return_value=[]):
            with pytest.raises(ValueError, match="not found"):
                client.update_skill("nonexistent", enabled=True)

    def test_install_skill(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)

            # Create a valid .skill archive
            skill_dir = tmp_path / "my-skill"
            skill_dir.mkdir()
            (skill_dir / "SKILL.md").write_text("---\nname: my-skill\ndescription: A skill\n---\nContent")

            archive_path = tmp_path / "my-skill.skill"
            with zipfile.ZipFile(archive_path, "w") as zf:
                zf.write(skill_dir / "SKILL.md", "my-skill/SKILL.md")

            skills_root = tmp_path / "skills"
            (skills_root / "custom").mkdir(parents=True)

            with (
                patch("nion.skills.loader.get_skills_root_path", return_value=skills_root),
                patch("nion.skills.validation._validate_skill_frontmatter", return_value=(True, "OK", "my-skill")),
            ):
                result = client.install_skill(archive_path)

            assert result["success"] is True
            assert result["skill_name"] == "my-skill"
            assert (skills_root / "custom" / "my-skill").exists()

    def test_install_skill_not_found(self, client):
        with pytest.raises(FileNotFoundError):
            client.install_skill("/nonexistent/path.skill")

    def test_install_skill_bad_extension(self, client):
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
            tmp_path = Path(f.name)
        try:
            with pytest.raises(ValueError, match=".skill extension"):
                client.install_skill(tmp_path)
        finally:
            tmp_path.unlink()


# ---------------------------------------------------------------------------
# Memory management
# ---------------------------------------------------------------------------


class TestMemoryManagement:
    def test_reload_memory(self, client):
        data = {"version": "2.0", "facts": []}
        with patch("nion.memory_os.compat.build_canonical_memory_payload", return_value=data):
            result = client.reload_memory()
        assert result == data

    def test_get_memory_config(self, client):
        config = MagicMock()
        config.enabled = True
        config.storage_path = ".nion/memory.json"
        config.debounce_seconds = 30
        config.max_facts = 100
        config.fact_confidence_threshold = 0.7
        config.injection_enabled = True
        config.max_injection_tokens = 2000

        with patch("nion.memory_os.compat.get_memory_os_config", return_value={
            "enabled": True,
            "storage_path": ".nion/memory-os/index.sqlite3",
            "debounce_seconds": 30,
            "max_facts": 100,
            "fact_confidence_threshold": 0.7,
            "injection_enabled": True,
            "max_injection_tokens": 2000,
        }):
            result = client.get_memory_config()

        assert result["enabled"] is True
        assert result["max_facts"] == 100

    def test_get_memory_status(self, client):
        config = MagicMock()
        config.enabled = True
        config.storage_path = ".nion/memory.json"
        config.debounce_seconds = 30
        config.max_facts = 100
        config.fact_confidence_threshold = 0.7
        config.injection_enabled = True
        config.max_injection_tokens = 2000

        data = {"version": "1.0", "facts": []}

        with (
            patch("nion.config.memory_config.get_memory_config", return_value=config),
            patch("nion.agents.memory.updater.get_memory_data", return_value=data),
        ):
            result = client.get_memory_status()

        assert "config" in result
        assert "data" in result


# ---------------------------------------------------------------------------
# Uploads
# ---------------------------------------------------------------------------


class TestUploads:
    def test_upload_files(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)

            # Create a source file
            src_file = tmp_path / "test.txt"
            src_file.write_text("hello")

            uploads_dir = tmp_path / "uploads"
            uploads_dir.mkdir()

            with patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir):
                result = client.upload_files("thread-1", [src_file])

            assert result["success"] is True
            assert len(result["files"]) == 1
            assert result["files"][0]["filename"] == "test.txt"
            assert "artifact_url" in result["files"][0]
            assert "message" in result
            assert (uploads_dir / "test.txt").exists()

    def test_upload_files_not_found(self, client):
        with pytest.raises(FileNotFoundError):
            client.upload_files("thread-1", ["/nonexistent/file.txt"])

    def test_upload_files_rejects_directory_path(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            with pytest.raises(ValueError, match="Path is not a file"):
                client.upload_files("thread-1", [tmp])

    def test_upload_files_reuses_single_executor_inside_event_loop(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            uploads_dir = tmp_path / "uploads"
            uploads_dir.mkdir()

            first = tmp_path / "first.pdf"
            second = tmp_path / "second.pdf"
            first.write_bytes(b"%PDF-1.4 first")
            second.write_bytes(b"%PDF-1.4 second")

            created_executors = []
            real_executor_cls = concurrent.futures.ThreadPoolExecutor

            async def fake_convert(path: Path) -> Path:
                md_path = path.with_suffix(".md")
                md_path.write_text(f"converted {path.name}")
                return md_path

            class FakeExecutor:
                def __init__(self, max_workers: int):
                    self.max_workers = max_workers
                    self.shutdown_calls = []
                    self._executor = real_executor_cls(max_workers=max_workers)
                    created_executors.append(self)

                def submit(self, fn, *args, **kwargs):
                    return self._executor.submit(fn, *args, **kwargs)

                def shutdown(self, wait: bool = True):
                    self.shutdown_calls.append(wait)
                    self._executor.shutdown(wait=wait)

            async def call_upload() -> dict:
                return client.upload_files("thread-async", [first, second])

            with (
                patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir),
                patch("nion.utils.file_conversion.CONVERTIBLE_EXTENSIONS", {".pdf"}),
                patch("nion.utils.file_conversion.convert_file_to_markdown", side_effect=fake_convert),
                patch("concurrent.futures.ThreadPoolExecutor", FakeExecutor),
            ):
                result = asyncio.run(call_upload())

            assert result["success"] is True
            assert len(result["files"]) == 2
            assert len(created_executors) == 1
            assert created_executors[0].max_workers == 1
            assert created_executors[0].shutdown_calls == [True]
            assert result["files"][0]["markdown_file"] == "first.md"
            assert result["files"][1]["markdown_file"] == "second.md"

    def test_list_uploads(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            uploads_dir = Path(tmp)
            (uploads_dir / "a.txt").write_text("a")
            (uploads_dir / "b.txt").write_text("bb")

            with patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir):
                result = client.list_uploads("thread-1")

            assert result["count"] == 2
            assert len(result["files"]) == 2
            names = {f["filename"] for f in result["files"]}
            assert names == {"a.txt", "b.txt"}
            # Verify artifact_url is present
            for f in result["files"]:
                assert "artifact_url" in f

    def test_delete_upload(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            uploads_dir = Path(tmp)
            (uploads_dir / "delete-me.txt").write_text("gone")

            with patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir):
                result = client.delete_upload("thread-1", "delete-me.txt")

            assert result["success"] is True
            assert "delete-me.txt" in result["message"]
            assert not (uploads_dir / "delete-me.txt").exists()

    def test_delete_upload_removes_markdown_companion(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            uploads_dir = Path(tmp)
            (uploads_dir / "report.pdf").write_bytes(b"pdf")
            (uploads_dir / "report.md").write_text("converted", encoding="utf-8")

            with patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir):
                result = client.delete_upload("thread-1", "report.pdf")

            assert result["success"] is True
            assert not (uploads_dir / "report.pdf").exists()
            assert not (uploads_dir / "report.md").exists()

    def test_delete_upload_not_found(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(NionClient, "_get_uploads_dir", return_value=Path(tmp)):
                with pytest.raises(FileNotFoundError):
                    client.delete_upload("thread-1", "nope.txt")

    def test_delete_upload_path_traversal(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            uploads_dir = Path(tmp)
            with patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir):
                with pytest.raises(PermissionError):
                    client.delete_upload("thread-1", "../../etc/passwd")


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------


class TestArtifacts:
    def test_get_artifact(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            user_data_dir = Path(tmp) / "user-data"
            outputs = user_data_dir / "outputs"
            outputs.mkdir(parents=True)
            (outputs / "result.txt").write_text("artifact content")

            mock_paths = MagicMock()
            mock_paths.sandbox_user_data_dir.return_value = user_data_dir

            with patch("nion.client.get_paths", return_value=mock_paths):
                content, mime = client.get_artifact("t1", "mnt/user-data/outputs/result.txt")

            assert content == b"artifact content"
            assert "text" in mime

    def test_get_artifact_not_found(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            user_data_dir = Path(tmp) / "user-data"
            user_data_dir.mkdir()

            mock_paths = MagicMock()
            mock_paths.sandbox_user_data_dir.return_value = user_data_dir

            with patch("nion.client.get_paths", return_value=mock_paths):
                with pytest.raises(FileNotFoundError):
                    client.get_artifact("t1", "mnt/user-data/outputs/nope.txt")

    def test_get_artifact_bad_prefix(self, client):
        with pytest.raises(ValueError, match="must start with"):
            client.get_artifact("t1", "bad/path/file.txt")

    def test_get_artifact_path_traversal(self, client):
        with tempfile.TemporaryDirectory() as tmp:
            user_data_dir = Path(tmp) / "user-data"
            user_data_dir.mkdir()

            mock_paths = MagicMock()
            mock_paths.sandbox_user_data_dir.return_value = user_data_dir

            with patch("nion.client.get_paths", return_value=mock_paths):
                with pytest.raises(PermissionError):
                    client.get_artifact("t1", "mnt/user-data/../../../etc/passwd")


# ===========================================================================
# Scenario-based integration tests
# ===========================================================================
# These tests simulate realistic user workflows end-to-end, exercising
# multiple methods in sequence to verify they compose correctly.


class TestScenarioMultiTurnConversation:
    """Scenario: User has a multi-turn conversation within a single thread."""

    def test_two_turn_conversation(self, client):
        """Two sequential chat() calls on the same thread_id produce
        independent results (without checkpointer, each call is stateless)."""
        ai1 = AIMessage(content="I'm a helpful assistant.", id="ai-1")
        ai2 = AIMessage(content="Python is great!", id="ai-2")

        agent = MagicMock()
        agent.stream.side_effect = [
            iter([{"messages": [HumanMessage(content="who are you?", id="h-1"), ai1]}]),
            iter([{"messages": [HumanMessage(content="what language?", id="h-2"), ai2]}]),
        ]

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            r1 = client.chat("who are you?", thread_id="thread-multi")
            r2 = client.chat("what language?", thread_id="thread-multi")

        assert r1 == "I'm a helpful assistant."
        assert r2 == "Python is great!"
        assert agent.stream.call_count == 2

    def test_stream_collects_all_event_types_across_turns(self, client):
        """A full turn emits messages-tuple (tool_call, tool_result, ai text) + values + end."""
        ai_tc = AIMessage(
            content="",
            id="ai-1",
            tool_calls=[
                {"name": "web_search", "args": {"query": "LangGraph"}, "id": "tc-1"},
            ],
        )
        tool_r = ToolMessage(content="LangGraph is a framework...", id="tm-1", tool_call_id="tc-1", name="web_search")
        ai_final = AIMessage(content="LangGraph is a framework for building agents.", id="ai-2")

        chunks = [
            {"messages": [HumanMessage(content="search", id="h-1"), ai_tc]},
            {"messages": [HumanMessage(content="search", id="h-1"), ai_tc, tool_r]},
            {"messages": [HumanMessage(content="search", id="h-1"), ai_tc, tool_r, ai_final], "title": "LangGraph Search"},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("search", thread_id="t-full"))

        # Verify expected event types
        types = set(e.type for e in events)
        assert types == {"messages-tuple", "values", "end", "tool-activity"}
        assert events[-1].type == "end"

        # Verify tool_call data
        tc_events = _tool_call_events(events)
        assert len(tc_events) == 1
        assert tc_events[0].data["tool_calls"][0]["name"] == "web_search"
        assert tc_events[0].data["tool_calls"][0]["args"] == {"query": "LangGraph"}

        # Verify tool_result data
        tr_events = _tool_result_events(events)
        assert len(tr_events) == 1
        assert tr_events[0].data["tool_call_id"] == "tc-1"
        assert "LangGraph" in tr_events[0].data["content"]

        # Verify AI text
        msg_events = _ai_events(events)
        assert any("framework" in e.data["content"] for e in msg_events)

        # Verify values event contains title
        values_events = [e for e in events if e.type == "values"]
        assert any(e.data.get("title") == "LangGraph Search" for e in values_events)


class TestScenarioToolChain:
    """Scenario: Agent chains multiple tool calls in sequence."""

    def test_multi_tool_chain(self, client):
        """Agent calls bash → reads output → calls write_file → responds."""
        ai_bash = AIMessage(
            content="",
            id="ai-1",
            tool_calls=[
                {"name": "bash", "args": {"cmd": "ls /mnt/user-data/workspace"}, "id": "tc-1"},
            ],
        )
        bash_result = ToolMessage(content="README.md\nsrc/", id="tm-1", tool_call_id="tc-1", name="bash")
        ai_write = AIMessage(
            content="",
            id="ai-2",
            tool_calls=[
                {"name": "write_file", "args": {"path": "/mnt/user-data/outputs/listing.txt", "content": "README.md\nsrc/"}, "id": "tc-2"},
            ],
        )
        write_result = ToolMessage(content="File written successfully.", id="tm-2", tool_call_id="tc-2", name="write_file")
        ai_final = AIMessage(content="I listed the workspace and saved the output.", id="ai-3")

        chunks = [
            {"messages": [HumanMessage(content="list and save", id="h-1"), ai_bash]},
            {"messages": [HumanMessage(content="list and save", id="h-1"), ai_bash, bash_result]},
            {"messages": [HumanMessage(content="list and save", id="h-1"), ai_bash, bash_result, ai_write]},
            {"messages": [HumanMessage(content="list and save", id="h-1"), ai_bash, bash_result, ai_write, write_result]},
            {"messages": [HumanMessage(content="list and save", id="h-1"), ai_bash, bash_result, ai_write, write_result, ai_final]},
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("list and save", thread_id="t-chain"))

        tool_calls = _tool_call_events(events)
        tool_results = _tool_result_events(events)
        messages = _ai_events(events)

        assert len(tool_calls) == 2
        assert tool_calls[0].data["tool_calls"][0]["name"] == "bash"
        assert tool_calls[1].data["tool_calls"][0]["name"] == "write_file"
        assert len(tool_results) == 2
        assert len(messages) == 1
        assert events[-1].type == "end"


class TestScenarioFileLifecycle:
    """Scenario: Upload files → list them → use in chat → download artifact."""

    def test_upload_list_delete_lifecycle(self, client):
        """Upload → list → verify → delete → list again."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            uploads_dir = tmp_path / "uploads"
            uploads_dir.mkdir()

            # Create source files
            (tmp_path / "report.txt").write_text("quarterly report data")
            (tmp_path / "data.csv").write_text("a,b,c\n1,2,3")

            with patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir):
                # Step 1: Upload
                result = client.upload_files(
                    "t-lifecycle",
                    [
                        tmp_path / "report.txt",
                        tmp_path / "data.csv",
                    ],
                )
                assert result["success"] is True
                assert len(result["files"]) == 2
                assert {f["filename"] for f in result["files"]} == {"report.txt", "data.csv"}

                # Step 2: List
                listed = client.list_uploads("t-lifecycle")
                assert listed["count"] == 2
                assert all("virtual_path" in f for f in listed["files"])

                # Step 3: Delete one
                del_result = client.delete_upload("t-lifecycle", "report.txt")
                assert del_result["success"] is True

                # Step 4: Verify deletion
                listed = client.list_uploads("t-lifecycle")
                assert listed["count"] == 1
                assert listed["files"][0]["filename"] == "data.csv"

    def test_upload_then_read_artifact(self, client):
        """Upload a file, simulate agent producing artifact, read it back."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            uploads_dir = tmp_path / "uploads"
            uploads_dir.mkdir()
            user_data_dir = tmp_path / "user-data"
            outputs_dir = user_data_dir / "outputs"
            outputs_dir.mkdir(parents=True)

            # Upload phase
            src_file = tmp_path / "input.txt"
            src_file.write_text("raw data to process")

            with patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir):
                uploaded = client.upload_files("t-artifact", [src_file])
                assert len(uploaded["files"]) == 1

            # Simulate agent writing an artifact
            (outputs_dir / "analysis.json").write_text('{"result": "processed"}')

            # Retrieve artifact
            mock_paths = MagicMock()
            mock_paths.sandbox_user_data_dir.return_value = user_data_dir

            with patch("nion.client.get_paths", return_value=mock_paths):
                content, mime = client.get_artifact("t-artifact", "mnt/user-data/outputs/analysis.json")

            assert json.loads(content) == {"result": "processed"}
            assert "json" in mime


class TestScenarioConfigManagement:
    """Scenario: Query and update configuration through a management session."""

    def test_model_and_skill_discovery(self, client):
        """List models → get specific model → list skills → get specific skill."""
        runtime_model = MagicMock()
        runtime_model.runtime_name = "test-model"
        runtime_model.model.model_id = "gpt-test"
        runtime_model.model.display_name = "Test Model"
        runtime_model.runtime_model_config.description = "A test model"
        runtime_model.runtime_model_config.supports_thinking = False
        runtime_model.runtime_model_config.supports_reasoning_effort = False
        runtime_model.runtime_model_config.supports_vision = False

        # List models
        with patch("nion.client.get_model_registry_service") as mock_service:
            mock_service.return_value.list_runtime_models.return_value = [runtime_model]
            mock_service.return_value.resolve_model.return_value = runtime_model
            result = client.list_models()
            assert len(result["models"]) >= 1
            model_name = result["models"][0]["name"]

            # Get specific model
            detail = client.get_model(model_name)
            assert detail["name"] == model_name

        # List skills
        skill = MagicMock()
        skill.name = "web-search"
        skill.description = "Search the web"
        skill.license = "MIT"
        skill.category = "public"
        skill.enabled = True

        with patch("nion.skills.loader.load_skills", return_value=[skill]):
            skills_result = client.list_skills()
        assert len(skills_result["skills"]) == 1

        # Get specific skill
        with patch("nion.skills.loader.load_skills", return_value=[skill]):
            detail = client.get_skill("web-search")
        assert detail is not None
        assert detail["enabled"] is True

    def test_mcp_update_then_skill_toggle(self, client):
        """Update MCP config → toggle skill → verify both invalidate agent."""
        with tempfile.TemporaryDirectory() as tmp:
            config_file = Path(tmp) / "extensions_config.json"
            config_file.write_text("{}")

            # --- MCP update ---
            current_config = MagicMock()
            current_config.skills = {}

            reloaded_server = MagicMock()
            reloaded_server.model_dump.return_value = {"enabled": True, "type": "sse"}
            reloaded_config = MagicMock()
            reloaded_config.mcp_servers = {"my-mcp": reloaded_server}

            client._agent = MagicMock()  # Simulate existing agent
            with (
                patch("nion.client.ExtensionsConfig.resolve_config_path", return_value=config_file),
                patch("nion.client.get_extensions_config", return_value=current_config),
                patch("nion.client.reload_extensions_config", return_value=reloaded_config),
            ):
                mcp_result = client.update_mcp_config({"my-mcp": {"enabled": True}})
            assert "my-mcp" in mcp_result["mcp_servers"]
            assert client._agent is None  # Agent invalidated

            # --- Skill toggle ---
            skill = MagicMock()
            skill.name = "code-gen"
            skill.description = "Generate code"
            skill.license = "MIT"
            skill.category = "custom"
            skill.enabled = True

            toggled = MagicMock()
            toggled.name = "code-gen"
            toggled.description = "Generate code"
            toggled.license = "MIT"
            toggled.category = "custom"
            toggled.enabled = False

            ext_config = MagicMock()
            ext_config.mcp_servers = {}
            ext_config.skills = {}

            client._agent = MagicMock()  # Simulate re-created agent
            with (
                patch("nion.skills.loader.load_skills", side_effect=[[skill], [toggled]]),
                patch("nion.client.ExtensionsConfig.resolve_config_path", return_value=config_file),
                patch("nion.client.get_extensions_config", return_value=ext_config),
                patch("nion.client.reload_extensions_config"),
            ):
                skill_result = client.update_skill("code-gen", enabled=False)
            assert skill_result["enabled"] is False
            assert client._agent is None  # Agent invalidated again


class TestScenarioAgentRecreation:
    """Scenario: Config changes trigger agent recreation at the right times."""

    def test_different_model_triggers_rebuild(self, client):
        """Switching model_name between calls forces agent rebuild."""
        agents_created = []

        def fake_create_agent(**kwargs):
            agent = MagicMock()
            agents_created.append(agent)
            return agent

        config_a = client._get_runnable_config("t1", model_name="gpt-4")
        config_b = client._get_runnable_config("t1", model_name="claude-3")

        with (
            patch("nion.client.create_chat_model"),
            patch("nion.client.create_agent", side_effect=fake_create_agent),
            patch("nion.client._build_middlewares", return_value=[]),
            patch("nion.client.apply_prompt_template", return_value="prompt"),
            patch.object(client, "_get_tools", return_value=[]),
        ):
            client._ensure_agent(config_a)
            first_agent = client._agent

            client._ensure_agent(config_b)
            second_agent = client._agent

        assert len(agents_created) == 2
        assert first_agent is not second_agent

    def test_same_config_reuses_agent(self, client):
        """Repeated calls with identical config do not rebuild."""
        agents_created = []

        def fake_create_agent(**kwargs):
            agent = MagicMock()
            agents_created.append(agent)
            return agent

        config = client._get_runnable_config("t1", model_name="gpt-4")

        with (
            patch("nion.client.create_chat_model"),
            patch("nion.client.create_agent", side_effect=fake_create_agent),
            patch("nion.client._build_middlewares", return_value=[]),
            patch("nion.client.apply_prompt_template", return_value="prompt"),
            patch.object(client, "_get_tools", return_value=[]),
        ):
            client._ensure_agent(config)
            client._ensure_agent(config)
            client._ensure_agent(config)

        assert len(agents_created) == 1

    def test_reset_agent_forces_rebuild(self, client):
        """reset_agent() clears cache, next call rebuilds."""
        agents_created = []

        def fake_create_agent(**kwargs):
            agent = MagicMock()
            agents_created.append(agent)
            return agent

        config = client._get_runnable_config("t1")

        with (
            patch("nion.client.create_chat_model"),
            patch("nion.client.create_agent", side_effect=fake_create_agent),
            patch("nion.client._build_middlewares", return_value=[]),
            patch("nion.client.apply_prompt_template", return_value="prompt"),
            patch.object(client, "_get_tools", return_value=[]),
        ):
            client._ensure_agent(config)
            client.reset_agent()
            client._ensure_agent(config)

        assert len(agents_created) == 2

    def test_per_call_override_triggers_rebuild(self, client):
        """stream() with model_name override creates a different agent config."""
        ai = AIMessage(content="ok", id="ai-1")
        agent = _make_agent_mock([{"messages": [ai]}])

        agents_created = []

        def fake_ensure(config):
            key = tuple(config.get("configurable", {}).get(k) for k in ["model_name", "thinking_enabled", "is_plan_mode", "subagent_enabled"])
            agents_created.append(key)
            client._agent = agent

        with patch.object(client, "_ensure_agent", side_effect=fake_ensure):
            list(client.stream("hi", thread_id="t1"))
            list(client.stream("hi", thread_id="t1", model_name="other-model"))

        # Two different config keys should have been created
        assert len(agents_created) == 2
        assert agents_created[0] != agents_created[1]


class TestScenarioThreadIsolation:
    """Scenario: Operations on different threads don't interfere."""

    def test_uploads_isolated_per_thread(self, client):
        """Files uploaded to thread-A are not visible in thread-B."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            uploads_a = tmp_path / "thread-a" / "uploads"
            uploads_b = tmp_path / "thread-b" / "uploads"
            uploads_a.mkdir(parents=True)
            uploads_b.mkdir(parents=True)

            src_file = tmp_path / "secret.txt"
            src_file.write_text("thread-a only")

            def get_dir(thread_id):
                return uploads_a if thread_id == "thread-a" else uploads_b

            with patch.object(NionClient, "_get_uploads_dir", side_effect=get_dir):
                client.upload_files("thread-a", [src_file])

                files_a = client.list_uploads("thread-a")
                files_b = client.list_uploads("thread-b")

            assert files_a["count"] == 1
            assert files_b["count"] == 0

    def test_artifacts_isolated_per_thread(self, client):
        """Artifacts in thread-A are not accessible from thread-B."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)

            data_a = tmp_path / "thread-a"
            data_b = tmp_path / "thread-b"
            (data_a / "outputs").mkdir(parents=True)
            (data_b / "outputs").mkdir(parents=True)
            (data_a / "outputs" / "result.txt").write_text("thread-a artifact")

            mock_paths = MagicMock()
            mock_paths.sandbox_user_data_dir.side_effect = lambda tid: data_a if tid == "thread-a" else data_b

            with patch("nion.client.get_paths", return_value=mock_paths):
                content, _ = client.get_artifact("thread-a", "mnt/user-data/outputs/result.txt")
                assert content == b"thread-a artifact"

                with pytest.raises(FileNotFoundError):
                    client.get_artifact("thread-b", "mnt/user-data/outputs/result.txt")


class TestScenarioMemoryWorkflow:
    """Scenario: Memory query → reload → status check."""

    def test_memory_full_lifecycle(self, client):
        """get_memory → reload → get_status covers the full memory API."""
        initial_data = {"version": "2.0", "facts": [{"id": "f1", "content": "User likes Python"}]}
        updated_data = {
            "version": "2.0",
            "facts": [
                {"id": "f1", "content": "User likes Python"},
                {"id": "f2", "content": "User prefers dark mode"},
            ],
        }
        user_facing_data = {
            "user_profile": [],
            "long_term_background": [],
            "fact_memories": [
                {
                    "id": "f1",
                    "content": "User likes Python",
                    "source_label": "事实记忆",
                    "updated_at": "",
                    "reason": "",
                    "related_refs": [],
                },
                {
                    "id": "f2",
                    "content": "User prefers dark mode",
                    "source_label": "事实记忆",
                    "updated_at": "",
                    "reason": "",
                    "related_refs": [],
                },
            ],
        }

        config = MagicMock()
        config.enabled = True
        config.storage_path = ".nion/memory.json"
        config.debounce_seconds = 30
        config.max_facts = 100
        config.fact_confidence_threshold = 0.7
        config.injection_enabled = True
        config.max_injection_tokens = 2000

        with patch("nion.memory_os.compat.build_canonical_memory_payload", return_value=initial_data):
            mem = client.get_memory()
        assert len(mem["facts"]) == 1

        with patch("nion.memory_os.compat.build_canonical_memory_payload", return_value=updated_data):
            refreshed = client.reload_memory()
        assert len(refreshed["facts"]) == 2

        with (
            patch("nion.memory_os.compat.get_memory_os_config", return_value={
                "enabled": True,
                "storage_path": ".nion/memory-os/index.sqlite3",
                "debounce_seconds": 30,
                "max_facts": 100,
                "fact_confidence_threshold": 0.7,
                "injection_enabled": True,
                "max_injection_tokens": 2000,
            }),
            patch("nion.memory_os.compat.build_memory_user_facing_payload", return_value=user_facing_data),
        ):
            status = client.get_memory_status()
        assert status["config"]["enabled"] is True
        assert len(status["data"]["fact_memories"]) == 2


class TestScenarioSkillInstallAndUse:
    """Scenario: Install a skill → verify it appears → toggle it."""

    def test_install_then_toggle(self, client):
        """Install .skill archive → list to verify → disable → verify disabled."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)

            # Create .skill archive
            skill_src = tmp_path / "my-analyzer"
            skill_src.mkdir()
            (skill_src / "SKILL.md").write_text("---\nname: my-analyzer\ndescription: Analyze code\nlicense: MIT\n---\nAnalysis skill")
            archive = tmp_path / "my-analyzer.skill"
            with zipfile.ZipFile(archive, "w") as zf:
                zf.write(skill_src / "SKILL.md", "my-analyzer/SKILL.md")

            skills_root = tmp_path / "skills"
            (skills_root / "custom").mkdir(parents=True)

            # Step 1: Install
            with (
                patch("nion.skills.loader.get_skills_root_path", return_value=skills_root),
                patch("nion.skills.validation._validate_skill_frontmatter", return_value=(True, "OK", "my-analyzer")),
            ):
                result = client.install_skill(archive)
            assert result["success"] is True
            assert (skills_root / "custom" / "my-analyzer" / "SKILL.md").exists()

            # Step 2: List and find it
            installed_skill = MagicMock()
            installed_skill.name = "my-analyzer"
            installed_skill.description = "Analyze code"
            installed_skill.license = "MIT"
            installed_skill.category = "custom"
            installed_skill.enabled = True

            with patch("nion.skills.loader.load_skills", return_value=[installed_skill]):
                skills_result = client.list_skills()
            assert any(s["name"] == "my-analyzer" for s in skills_result["skills"])

            # Step 3: Disable it
            disabled_skill = MagicMock()
            disabled_skill.name = "my-analyzer"
            disabled_skill.description = "Analyze code"
            disabled_skill.license = "MIT"
            disabled_skill.category = "custom"
            disabled_skill.enabled = False

            ext_config = MagicMock()
            ext_config.mcp_servers = {}
            ext_config.skills = {}

            config_file = tmp_path / "extensions_config.json"
            config_file.write_text("{}")

            with (
                patch("nion.skills.loader.load_skills", side_effect=[[installed_skill], [disabled_skill]]),
                patch("nion.client.ExtensionsConfig.resolve_config_path", return_value=config_file),
                patch("nion.client.get_extensions_config", return_value=ext_config),
                patch("nion.client.reload_extensions_config"),
            ):
                toggled = client.update_skill("my-analyzer", enabled=False)
            assert toggled["enabled"] is False


class TestScenarioEdgeCases:
    """Scenario: Edge cases and error boundaries in realistic workflows."""

    def test_empty_stream_response(self, client):
        """Agent produces no messages — only values + end events."""
        agent = _make_agent_mock([{"messages": []}])

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t-empty"))

        # values event (empty messages) + end
        assert len(events) == 2
        assert events[0].type == "values"
        assert events[-1].type == "end"

    def test_stream_survives_cross_context_iteration(self, client):
        """stream() should not fail when the underlying graph yields across contexts."""

        def stream_generator(*args, **kwargs):
            yield ("values", {"messages": [HumanMessage(content="hi", id="human-1")]})

        agent = MagicMock()
        agent.stream = MagicMock(side_effect=stream_generator)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t-cross-context"))

        assert events[0].type == "values"
        assert events[-1].type == "end"

    def test_chat_on_empty_response(self, client):
        """chat() returns empty string for no-message response."""
        agent = _make_agent_mock([{"messages": []}])

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            result = client.chat("hi", thread_id="t-empty-chat")

        assert result == ""

    def test_multiple_title_changes(self, client):
        """Title changes are carried in values events."""
        ai = AIMessage(content="ok", id="ai-1")
        chunks = [
            {"messages": [ai], "title": "First Title"},
            {"messages": [], "title": "First Title"},  # same title repeated
            {"messages": [], "title": "Second Title"},  # different title
        ]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t-titles"))

        # Every chunk produces a values event with the title
        values_events = [e for e in events if e.type == "values"]
        assert len(values_events) == 3
        assert values_events[0].data["title"] == "First Title"
        assert values_events[1].data["title"] == "First Title"
        assert values_events[2].data["title"] == "Second Title"

    def test_values_event_preserves_human_message_additional_kwargs(self, client):
        summary = HumanMessage(
            content="中文摘要",
            id="summary-1",
            additional_kwargs={
                "internal_summary": True,
                "summary_locale": "zh-CN",
                "summary_format_version": 1,
            },
        )
        chunks = [{"messages": [summary], "title": "T"}]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("hi", thread_id="t-summary-values"))

        values_events = [event for event in events if event.type == "values"]
        assert values_events
        assert values_events[-1].data["messages"] == [
            {
                "type": "human",
                "content": "中文摘要",
                "id": "summary-1",
                "additional_kwargs": {
                    "internal_summary": True,
                    "summary_locale": "zh-CN",
                    "summary_format_version": 1,
                },
            }
        ]

    def test_stream_values_include_locale_aware_summary_metadata_end_to_end(self, client):
        with (
            patch("nion.client.create_chat_model", return_value=SimpleNamespace(_llm_type="openai-chat")),
            patch.object(client, "_get_tools", return_value=[]),
            patch("nion.client.apply_prompt_template", return_value="prompt"),
            patch(
                "nion.client.create_agent",
                side_effect=_make_summarying_agent,
            ),
            patch(
                "nion.agents.lead_agent.agent.get_summarization_config",
                return_value=SummarizationConfig(
                    enabled=True,
                    trigger=ContextSize(type="messages", value=2),
                    keep=ContextSize(type="messages", value=1),
                    summary_prompt=None,
                ),
            ),
            patch.object(
                LocaleAwareSummarizationMiddleware,
                "_create_summary_with_prompt",
                lambda self, messages_to_summarize, prompt: "中文摘要",
            ),
        ):
            events = list(client.stream("hi", thread_id="t-locale-summary", locale="zh-CN"))

        values_events = [event for event in events if event.type == "values"]
        assert values_events
        summary_projection = values_events[-1].data["messages"][0]
        assert summary_projection["type"] == "human"
        assert summary_projection["content"] == "中文摘要"
        assert summary_projection["additional_kwargs"]["internal_summary"] is True
        assert summary_projection["additional_kwargs"]["summary_locale"] == "zh-CN"
        assert summary_projection["additional_kwargs"]["summary_format_version"] == 1


def _make_summarying_agent(**kwargs):
    middlewares = kwargs["middleware"]

    class _Agent:
        def stream(self, state, *, config, context, stream_mode):
            working_state = {
                "messages": [
                    HumanMessage(content="你好", id="h-1"),
                    AIMessage(content="世界", id="ai-1"),
                    HumanMessage(content="保留", id="h-2"),
                ]
            }
            runtime = SimpleNamespace(context=context)

            for middleware in middlewares:
                if isinstance(middleware, LocaleAwareSummarizationMiddleware):
                    result = middleware.before_model(working_state, runtime)
                    if result is not None:
                        working_state["messages"] = result["messages"][1:]
                    break

            yield (
                "values",
                {
                    "messages": working_state["messages"],
                    "title": "T",
                    "artifacts": [],
                },
            )

    return _Agent()

    def test_concurrent_tool_calls_in_single_message(self, client):
        """Agent produces multiple tool_calls in one AIMessage — emitted as single messages-tuple."""
        ai = AIMessage(
            content="",
            id="ai-1",
            tool_calls=[
                {"name": "web_search", "args": {"q": "a"}, "id": "tc-1"},
                {"name": "web_search", "args": {"q": "b"}, "id": "tc-2"},
                {"name": "bash", "args": {"cmd": "echo hi"}, "id": "tc-3"},
            ],
        )
        chunks = [{"messages": [ai]}]
        agent = _make_agent_mock(chunks)

        with (
            patch.object(client, "_ensure_agent"),
            patch.object(client, "_agent", agent),
        ):
            events = list(client.stream("do things", thread_id="t-parallel"))

        tc_events = _tool_call_events(events)
        assert len(tc_events) == 1  # One messages-tuple event for the AIMessage
        tool_calls = tc_events[0].data["tool_calls"]
        assert len(tool_calls) == 3
        assert {tc["id"] for tc in tool_calls} == {"tc-1", "tc-2", "tc-3"}

    def test_upload_convertible_file_conversion_failure(self, client):
        """Upload a .pdf file where conversion fails — file still uploaded, no markdown."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            uploads_dir = tmp_path / "uploads"
            uploads_dir.mkdir()

            pdf_file = tmp_path / "doc.pdf"
            pdf_file.write_bytes(b"%PDF-1.4 fake content")

            with (
                patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir),
                patch("nion.utils.file_conversion.CONVERTIBLE_EXTENSIONS", {".pdf"}),
                patch("nion.utils.file_conversion.convert_file_to_markdown", side_effect=Exception("conversion failed")),
            ):
                result = client.upload_files("t-pdf-fail", [pdf_file])

            assert result["success"] is True
            assert len(result["files"]) == 1
            assert result["files"][0]["filename"] == "doc.pdf"
            assert "markdown_file" not in result["files"][0]  # Conversion failed gracefully
            assert (uploads_dir / "doc.pdf").exists()  # File still uploaded


# ---------------------------------------------------------------------------
# Gateway conformance — validate client output against Gateway Pydantic models
# ---------------------------------------------------------------------------


class TestGatewayConformance:
    """Validate that NionClient return dicts conform to Gateway Pydantic response models.

    Each test calls a client method, then parses the result through the
    corresponding Gateway response model. If the client drifts (missing or
    wrong-typed fields), Pydantic raises ``ValidationError`` and CI catches it.
    """

    def test_list_models(self, mock_app_config):
        with patch("nion.client.get_app_config", return_value=mock_app_config):
            client = NionClient()

        runtime_model = MagicMock()
        runtime_model.runtime_name = "test-model"
        runtime_model.model.model_id = "gpt-test"
        runtime_model.model.display_name = "Test Model"
        runtime_model.runtime_model_config.description = "A test model"
        runtime_model.runtime_model_config.supports_thinking = False
        runtime_model.runtime_model_config.supports_reasoning_effort = False
        runtime_model.runtime_model_config.supports_vision = False
        with patch("nion.client.get_model_registry_service") as mock_service:
            mock_service.return_value.list_runtime_models.return_value = [runtime_model]
            result = client.list_models()

        parsed = ModelsListResponse(**result)
        assert len(parsed.models) == 1
        assert parsed.models[0].name == "test-model"
        assert parsed.models[0].model == "gpt-test"

    def test_get_model(self, mock_app_config):
        with patch("nion.client.get_app_config", return_value=mock_app_config):
            client = NionClient()

        runtime_model = MagicMock()
        runtime_model.runtime_name = "test-model"
        runtime_model.model.model_id = "gpt-test"
        runtime_model.model.display_name = "Test Model"
        runtime_model.runtime_model_config.description = "A test model"
        runtime_model.runtime_model_config.supports_thinking = True
        runtime_model.runtime_model_config.supports_reasoning_effort = False
        runtime_model.runtime_model_config.supports_vision = False
        with patch("nion.client.get_model_registry_service") as mock_service:
            mock_service.return_value.resolve_model.return_value = runtime_model
            result = client.get_model("test-model")

        assert result is not None
        parsed = ModelResponse(**result)
        assert parsed.name == "test-model"
        assert parsed.model == "gpt-test"

    def test_list_skills(self, client):
        skill = MagicMock()
        skill.skill_path = "web-search"
        skill.name = "web-search"
        skill.description = "Search the web"
        skill.license = "MIT"
        skill.category = "public"
        skill.enabled = True

        with patch("nion.skills.loader.load_skills", return_value=[skill]):
            result = client.list_skills()

        parsed = SkillsListResponse(**result)
        assert len(parsed.skills) == 1
        assert parsed.skills[0].name == "web-search"

    def test_get_skill(self, client):
        skill = MagicMock()
        skill.skill_path = "web-search"
        skill.name = "web-search"
        skill.description = "Search the web"
        skill.license = "MIT"
        skill.category = "public"
        skill.enabled = True

        with patch("nion.skills.loader.load_skills", return_value=[skill]):
            result = client.get_skill("web-search")

        assert result is not None
        parsed = SkillResponse(**result)
        assert parsed.name == "web-search"

    def test_install_skill(self, client, tmp_path):
        skill_dir = tmp_path / "my-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("---\nname: my-skill\ndescription: A test skill\n---\nBody\n")

        archive = tmp_path / "my-skill.skill"
        with zipfile.ZipFile(archive, "w") as zf:
            zf.write(skill_dir / "SKILL.md", "my-skill/SKILL.md")

        custom_dir = tmp_path / "custom"
        custom_dir.mkdir()
        with patch("nion.skills.loader.get_skills_root_path", return_value=tmp_path):
            result = client.install_skill(archive)

        parsed = SkillInstallResponse(**result)
        assert parsed.success is True
        assert parsed.skill_name == "my-skill"

    def test_get_mcp_config(self, client):
        server = MagicMock()
        server.model_dump.return_value = {
            "enabled": True,
            "type": "stdio",
            "command": "npx",
            "args": ["-y", "server"],
            "env": {},
            "url": None,
            "headers": {},
            "description": "test server",
        }
        ext_config = MagicMock()
        ext_config.mcp_servers = {"test": server}

        with patch("nion.client.get_extensions_config", return_value=ext_config):
            result = client.get_mcp_config()

        parsed = McpConfigResponse(**result)
        assert "test" in parsed.mcp_servers

    def test_update_mcp_config(self, client, tmp_path):
        server = MagicMock()
        server.model_dump.return_value = {
            "enabled": True,
            "type": "stdio",
            "command": "npx",
            "args": [],
            "env": {},
            "url": None,
            "headers": {},
            "description": "",
        }
        ext_config = MagicMock()
        ext_config.mcp_servers = {"srv": server}
        ext_config.skills = {}

        config_file = tmp_path / "extensions_config.json"
        config_file.write_text("{}")

        with (
            patch("nion.client.get_extensions_config", return_value=ext_config),
            patch("nion.client.ExtensionsConfig.resolve_config_path", return_value=config_file),
            patch("nion.client.reload_extensions_config", return_value=ext_config),
        ):
            result = client.update_mcp_config({"srv": server.model_dump.return_value})

        parsed = McpConfigResponse(**result)
        assert "srv" in parsed.mcp_servers

    def test_upload_files(self, client, tmp_path):
        uploads_dir = tmp_path / "uploads"
        uploads_dir.mkdir()

        src_file = tmp_path / "hello.txt"
        src_file.write_text("hello")

        with patch.object(NionClient, "_get_uploads_dir", return_value=uploads_dir):
            result = client.upload_files("t-conform", [src_file])

        parsed = UploadResponse(**result)
        assert parsed.success is True
        assert len(parsed.files) == 1

    def test_get_memory_config(self, client):
        mem_cfg = MagicMock()
        mem_cfg.enabled = True
        mem_cfg.storage_path = ".nion/memory.json"
        mem_cfg.debounce_seconds = 30
        mem_cfg.max_facts = 100
        mem_cfg.fact_confidence_threshold = 0.7
        mem_cfg.injection_enabled = True
        mem_cfg.max_injection_tokens = 2000

        with patch("nion.memory_os.compat.get_memory_os_config", return_value={
            "enabled": True,
            "storage_path": ".nion/memory-os/index.sqlite3",
            "debounce_seconds": 30,
            "max_facts": 100,
            "fact_confidence_threshold": 0.7,
            "injection_enabled": True,
            "max_injection_tokens": 2000,
        }):
            result = client.get_memory_config()

        parsed = MemoryConfigResponse(**result)
        assert parsed.enabled is True
        assert parsed.max_facts == 100

    def test_get_memory_status(self, client):
        mem_cfg = MagicMock()
        mem_cfg.enabled = True
        mem_cfg.storage_path = ".nion/memory.json"
        mem_cfg.debounce_seconds = 30
        mem_cfg.max_facts = 100
        mem_cfg.fact_confidence_threshold = 0.7
        mem_cfg.injection_enabled = True
        mem_cfg.max_injection_tokens = 2000

        with (
            patch("nion.memory_os.compat.get_memory_os_config", return_value={
                "enabled": True,
                "storage_path": ".nion/memory-os/index.sqlite3",
                "debounce_seconds": 30,
                "max_facts": 100,
                "fact_confidence_threshold": 0.7,
                "injection_enabled": True,
                "max_injection_tokens": 2000,
            }),
            patch(
                "nion.memory_os.compat.build_memory_user_facing_payload",
                return_value={
                    "user_profile": [],
                    "long_term_background": [],
                    "fact_memories": [],
                },
            ),
        ):
            result = client.get_memory_status()

        parsed = MemoryStatusResponse(**result)
        assert parsed.config.enabled is True
        assert parsed.data.fact_memories == []
