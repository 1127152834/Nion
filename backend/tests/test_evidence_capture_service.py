from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from langchain_core.messages import AIMessage, HumanMessage

from nion.client import NionClient
from nion.memory.evidence_capture.service import capture_turn_evidence
from nion.threads.models import ThreadStreamRequest
from nion.threads.service import ThreadService


def test_capture_turn_evidence_persists_durable_evidence_when_allowed(tmp_path: Path):
    result = capture_turn_evidence(
        thread_id="thread-1",
        turn_id="turn-1",
        messages=[
            {"type": "human", "content": "用户说明最近睡眠很浅。", "id": "human-1"},
            {"type": "ai", "content": "建议先降低夜间刺激并减少临睡前的信息输入。", "id": "ai-1"},
        ],
        session_mode="workspace",
        memory_read=True,
        memory_write=True,
        base_dir=tmp_path,
    )

    assert result is not None
    assert len(result) == 2
    assert {item["durability_scope"] for item in result} == {"durable_user_memory"}
    assert all(item["artifact_uri"] for item in result)
    assert all(Path(item["document_path"]).exists() for item in result)


def test_capture_turn_evidence_keeps_results_ephemeral_when_durable_write_disabled(
    tmp_path: Path,
):
    result = capture_turn_evidence(
        thread_id="thread-2",
        turn_id="turn-2",
        messages=[
            {"type": "human", "content": "这是一次 temporary_chat 的临时问题。", "id": "human-2"},
            {"type": "ai", "content": "这是只允许 session-local 保存的回答。", "id": "ai-2"},
        ],
        session_mode="temporary_chat",
        memory_read=True,
        memory_write=False,
        base_dir=tmp_path,
    )

    assert result is not None
    assert len(result) == 2
    assert {item["durability_scope"] for item in result} == {"session_ephemeral"}
    assert all(item["artifact_uri"] is None for item in result)
    assert all(not Path(item["document_path"]).exists() for item in result)
    assert not (tmp_path / "memory-os" / "evidence.sqlite3").exists()


def test_thread_service_stream_passes_session_policy_to_client():
    client = MagicMock()
    client.stream.return_value = iter(
        [SimpleNamespace(type="values", data={"title": "T", "messages": [], "artifacts": []})]
    )
    repository = MagicMock()
    repository.get_thread.return_value = None
    repository.upsert_thread.return_value = SimpleNamespace(
        values=SimpleNamespace(model_dump=lambda: {})
    )
    service = ThreadService(repository=repository, client=client)

    request = ThreadStreamRequest(
        messages=[{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
        context={
            "session_mode": "temporary_chat",
            "memory_read": True,
            "memory_write": False,
        },
        config={},
    )

    list(service.stream("thread-1", request))

    kwargs = client.stream.call_args.kwargs
    assert kwargs["session_mode"] == "temporary_chat"
    assert kwargs["memory_read"] is True
    assert kwargs["memory_write"] is False


def test_thread_service_stream_ignores_string_truthiness_for_session_policy():
    client = MagicMock()
    client.stream.return_value = iter(
        [SimpleNamespace(type="values", data={"title": "T", "messages": [], "artifacts": []})]
    )
    repository = MagicMock()
    repository.get_thread.return_value = None
    repository.upsert_thread.return_value = SimpleNamespace(
        values=SimpleNamespace(model_dump=lambda: {})
    )
    service = ThreadService(repository=repository, client=client)

    request = ThreadStreamRequest(
        messages=[{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
        context={
            "session_mode": "temporary_chat",
            "memory_read": "false",
            "memory_write": "0",
        },
        config={},
    )

    list(service.stream("thread-1", request))

    kwargs = client.stream.call_args.kwargs
    assert kwargs["memory_read"] is True
    assert kwargs["memory_write"] is False


def test_client_stream_calls_capture_service_with_session_policy():
    client = NionClient()
    agent = MagicMock()
    agent.stream.return_value = iter(
        [
            {
                "messages": [
                    HumanMessage(content="用户提到最近焦虑。", id="human-1"),
                    AIMessage(content="建议先把今晚的任务减到一件。", id="ai-1"),
                ],
                "title": "T",
                "artifacts": [],
            }
        ]
    )

    with (
        patch.object(client, "_ensure_agent"),
        patch.object(client, "_agent", agent),
        patch("nion.client.capture_turn_evidence") as capture_mock,
    ):
        capture_mock.return_value = []
        list(
            client.stream(
                "用户提到最近焦虑。",
                thread_id="thread-1",
                session_mode="temporary_chat",
                memory_read=True,
                memory_write=False,
            )
        )

    capture_mock.assert_called_once()
    kwargs = capture_mock.call_args.kwargs
    assert kwargs["thread_id"] == "thread-1"
    assert kwargs["session_mode"] == "temporary_chat"
    assert kwargs["memory_read"] is True
    assert kwargs["memory_write"] is False
    assert kwargs["messages"] == [
        {"type": "human", "content": "用户提到最近焦虑。", "id": "human-1"},
        {"type": "ai", "content": "建议先把今晚的任务减到一件。", "id": "ai-1"},
    ]


def test_client_stream_captures_only_new_human_and_ai_messages():
    client = NionClient()
    historical_human = HumanMessage(content="历史用户消息", id="human-old")
    historical_ai = AIMessage(content="历史助手消息", id="ai-old")
    current_human = HumanMessage(content="本轮新用户消息", id="human-new")
    current_ai = AIMessage(content="本轮新助手消息", id="ai-new")
    agent = MagicMock()
    agent.stream.return_value = iter(
        [
            {
                "messages": [historical_human, historical_ai, current_human],
                "title": "T",
                "artifacts": [],
            },
            {
                "messages": [historical_human, historical_ai, current_human, current_ai],
                "title": "T",
                "artifacts": [],
            },
        ]
    )

    with (
        patch.object(client, "_ensure_agent"),
        patch.object(client, "_agent", agent),
        patch("nion.client.capture_turn_evidence") as capture_mock,
    ):
        capture_mock.return_value = []
        list(
            client.stream(
                "本轮新用户消息",
                thread_id="thread-1",
                session_mode="workspace",
                memory_read=True,
                memory_write=True,
            )
        )

    kwargs = capture_mock.call_args.kwargs
    assert kwargs["messages"] == [
        {"type": "human", "content": "本轮新用户消息", "id": "human-new"},
        {"type": "ai", "content": "本轮新助手消息", "id": "ai-new"},
    ]
