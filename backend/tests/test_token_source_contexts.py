"""Focused tests for helper-call token source contexts."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from langchain_core.messages import AIMessage, HumanMessage

from nion.agents.memory.updater import MemoryUpdater
from nion.agents.middlewares.title_middleware import TitleMiddleware
from nion.cli_tools.service import CliToolsService
from nion.telemetry.token_source import get_current_token_source


def test_title_middleware_uses_title_generation_source(monkeypatch):
    middleware = TitleMiddleware()
    fake_model = MagicMock()

    def fake_invoke(prompt):
        assert get_current_token_source() == "title_generation"
        return SimpleNamespace(content='"Title"')

    fake_model.invoke = fake_invoke

    monkeypatch.setattr(
        "nion.agents.middlewares.title_middleware.resolve_model_name_with_fallback",
        lambda model_name=None: "default-model",
    )
    monkeypatch.setattr(
        "nion.agents.middlewares.title_middleware.create_chat_model",
        lambda **kwargs: fake_model,
    )

    state = {
        "messages": [
            HumanMessage(content="给这个对话起标题"),
            AIMessage(content="好的"),
        ]
    }
    result = middleware._generate_title_result(state)
    assert result == {"title": "Title"}


def test_memory_updater_uses_memory_update_source(monkeypatch):
    updater = MemoryUpdater()
    fake_model = MagicMock()

    def fake_invoke(prompt):
        assert get_current_token_source() == "memory_update"
        return SimpleNamespace(content='{"newFacts": [], "factsToRemove": []}')

    fake_model.invoke = fake_invoke

    monkeypatch.setattr(
        "nion.agents.memory.updater.get_memory_config",
        lambda: SimpleNamespace(enabled=True, model_name=None, max_facts=100, fact_confidence_threshold=0.7),
    )
    monkeypatch.setattr(
        "nion.agents.memory.updater.get_memory_data",
        lambda agent_name=None: {
            "version": "1.0",
            "lastUpdated": "",
            "user": {"workContext": {"summary": "", "updatedAt": ""}, "personalContext": {"summary": "", "updatedAt": ""}, "topOfMind": {"summary": "", "updatedAt": ""}},
            "history": {"recentMonths": {"summary": "", "updatedAt": ""}, "earlierContext": {"summary": "", "updatedAt": ""}, "longTermBackground": {"summary": "", "updatedAt": ""}},
            "facts": [],
        },
    )
    monkeypatch.setattr("nion.agents.memory.updater.get_memory_storage", lambda: SimpleNamespace(save=lambda memory, agent_name=None: True))
    monkeypatch.setattr("nion.agents.memory.updater.create_chat_model", lambda **kwargs: fake_model)

    assert updater.update_memory([HumanMessage(content="记住我喜欢简洁回复")], thread_id="thread-1") is True


def test_cli_tools_describe_uses_cli_tool_describe_source(monkeypatch):
    service = CliToolsService()
    fake_model = MagicMock()
    payload = (
        '{"intro":{"zh":"中文简介","en":"English intro"},'
        '"useCases":{"zh":["用例1"],"en":["Use case 1"]},'
        '"guideSteps":{"zh":["步骤1"],"en":["Step 1"]},'
        '"examplePrompts":[{"label":"demo","promptZh":"中文提示","promptEn":"English prompt"}]}'
    )

    def fake_invoke(messages):
        assert get_current_token_source() == "cli_tool_describe"
        return SimpleNamespace(content=payload)

    fake_model.invoke = fake_invoke

    monkeypatch.setattr("nion.cli_tools.service.get_catalog_tool", lambda tool_id: SimpleNamespace(
        id=tool_id,
        name="ffmpeg",
        binNames=["ffmpeg"],
        categories=["media"],
        homepage="https://ffmpeg.org",
        supportsAutoDescribe=True,
        summaryEn="",
        setupType="none",
        guideSteps=SimpleNamespace(en=[]),
    ))
    monkeypatch.setattr("nion.cli_tools.service.list_extra_well_known_bins", lambda: [])
    monkeypatch.setattr("nion.cli_tools.service.get_model_registry_service", lambda: SimpleNamespace(get_default_model=lambda: SimpleNamespace(runtime_name="test-model")))
    monkeypatch.setattr("nion.cli_tools.service.create_chat_model", lambda **kwargs: fake_model)
    monkeypatch.setattr(service._repository, "upsert_description", lambda **kwargs: None)

    result = service.describe_tool(tool_id="ffmpeg")
    assert result.zh == "中文简介"
