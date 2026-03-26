import asyncio
from unittest.mock import MagicMock

from app.gateway.routers import suggestions


def test_strip_markdown_code_fence_removes_wrapping():
    text = '```json\n["a"]\n```'
    assert suggestions._strip_markdown_code_fence(text) == '["a"]'


def test_strip_markdown_code_fence_no_fence_keeps_content():
    text = '  ["a"]  '
    assert suggestions._strip_markdown_code_fence(text) == '["a"]'


def test_parse_json_string_list_filters_invalid_items():
    text = '```json\n["a", " ", 1, "b"]\n```'
    assert suggestions._parse_json_string_list(text) == ["a", "b"]


def test_parse_json_string_list_rejects_non_list():
    text = '{"a": 1}'
    assert suggestions._parse_json_string_list(text) is None


def test_format_conversation_formats_roles():
    messages = [
        suggestions.SuggestionMessage(role="User", content="Hi"),
        suggestions.SuggestionMessage(role="assistant", content="Hello"),
        suggestions.SuggestionMessage(role="system", content="note"),
    ]
    assert suggestions._format_conversation(messages) == "User: Hi\nAssistant: Hello\nsystem: note"


def test_generate_suggestions_parses_and_limits(monkeypatch):
    req = suggestions.SuggestionsRequest(
        messages=[
            suggestions.SuggestionMessage(role="user", content="Hi"),
            suggestions.SuggestionMessage(role="assistant", content="Hello"),
        ],
        n=3,
        model_name=None,
    )
    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content='```json\n["Q1", "Q2", "Q3", "Q4"]\n```')
    monkeypatch.setattr(
        suggestions,
        "resolve_model_name_with_fallback",
        lambda configured_model_name=None: "default-model",
    )
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)

    result = asyncio.run(suggestions.generate_suggestions("t1", req))

    assert result.suggestions == ["Q1", "Q2", "Q3"]


def test_generate_suggestions_parses_list_block_content(monkeypatch):
    req = suggestions.SuggestionsRequest(
        messages=[
            suggestions.SuggestionMessage(role="user", content="Hi"),
            suggestions.SuggestionMessage(role="assistant", content="Hello"),
        ],
        n=2,
        model_name=None,
    )
    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content=[{"type": "text", "text": '```json\n["Q1", "Q2"]\n```'}])
    monkeypatch.setattr(
        suggestions,
        "resolve_model_name_with_fallback",
        lambda configured_model_name=None: "default-model",
    )
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)

    result = asyncio.run(suggestions.generate_suggestions("t1", req))

    assert result.suggestions == ["Q1", "Q2"]


def test_generate_suggestions_parses_output_text_block_content(monkeypatch):
    req = suggestions.SuggestionsRequest(
        messages=[
            suggestions.SuggestionMessage(role="user", content="Hi"),
            suggestions.SuggestionMessage(role="assistant", content="Hello"),
        ],
        n=2,
        model_name=None,
    )
    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content=[{"type": "output_text", "text": '```json\n["Q1", "Q2"]\n```'}])
    monkeypatch.setattr(
        suggestions,
        "resolve_model_name_with_fallback",
        lambda configured_model_name=None: "default-model",
    )
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)

    result = asyncio.run(suggestions.generate_suggestions("t1", req))

    assert result.suggestions == ["Q1", "Q2"]


def test_generate_suggestions_returns_empty_on_model_error(monkeypatch):
    req = suggestions.SuggestionsRequest(
        messages=[suggestions.SuggestionMessage(role="user", content="Hi")],
        n=2,
        model_name=None,
    )
    fake_model = MagicMock()
    fake_model.invoke.side_effect = RuntimeError("boom")
    monkeypatch.setattr(
        suggestions,
        "resolve_model_name_with_fallback",
        lambda configured_model_name=None: "default-model",
    )
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)

    result = asyncio.run(suggestions.generate_suggestions("t1", req))

    assert result.suggestions == []


def test_generate_suggestions_uses_default_policy_model_when_no_override(monkeypatch):
    req = suggestions.SuggestionsRequest(
        messages=[
            suggestions.SuggestionMessage(role="user", content="Hi"),
            suggestions.SuggestionMessage(role="assistant", content="Hello"),
        ],
        n=2,
        model_name="request-model",
    )
    captured: dict[str, str | None] = {"name": None}

    class _FakeResponse:
        content = '["Q1", "Q2"]'

    class _FakeChatModel:
        def invoke(self, _prompt):
            return _FakeResponse()

    monkeypatch.setattr(
        suggestions,
        "resolve_model_name_with_fallback",
        lambda configured_model_name=None: "default-model",
    )

    def _fake_create_chat_model(*, name=None, thinking_enabled=False):
        captured["name"] = name
        assert thinking_enabled is False
        return _FakeChatModel()

    monkeypatch.setattr(suggestions, "create_chat_model", _fake_create_chat_model)

    result = asyncio.run(suggestions.generate_suggestions("t1", req))

    assert result.suggestions == ["Q1", "Q2"]
    assert captured["name"] == "default-model"
