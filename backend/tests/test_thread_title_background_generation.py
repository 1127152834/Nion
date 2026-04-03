from __future__ import annotations

from typing import Any

from nion.client import StreamEvent
from nion.threads.models import ThreadStreamRequest
from nion.threads.repository import ThreadRepository
from nion.threads.service import ThreadService


def _request(text: str) -> ThreadStreamRequest:
    return ThreadStreamRequest(
        messages=[
            {
                "type": "human",
                "content": [{"type": "text", "text": text}],
                "additional_kwargs": {},
            }
        ],
        context={},
        config={},
    )


def test_thread_service_persists_stream_messages_but_titles_update_out_of_band(tmp_path) -> None:
    repository = ThreadRepository(base_dir=tmp_path)

    class FakeClient:
        def stream(self, *args: Any, **kwargs: Any):
            yield StreamEvent(
                type="messages-tuple",
                data={"type": "ai", "id": "ai-1", "content": "你好！有什么我可以帮你的？"},
            )
            yield StreamEvent(
                type="values",
                data={
                    "title": "Untitled",
                    "messages": [
                        {
                            "type": "human",
                            "id": "human-1",
                            "content": [{"type": "text", "text": "你好"}],
                        },
                        {
                            "type": "ai",
                            "id": "ai-1",
                            "content": "你好！有什么我可以帮你的？",
                        },
                    ],
                    "artifacts": [],
                },
            )
            yield StreamEvent(type="end", data={"usage": {}})

    captured_generation_inputs: list[dict[str, Any]] = []

    def fake_generate(thread_id: str, values: dict[str, Any], context: dict[str, Any]) -> None:
        captured_generation_inputs.append(
            {
                "thread_id": thread_id,
                "title_before": values.get("title"),
                "message_count": len(values.get("messages", [])),
            }
        )
        repository.update_state(thread_id, {"title": "中文问候对话标题"})

    service = ThreadService(repository=repository, client=FakeClient())
    service._queue_title_generation = fake_generate  # type: ignore[attr-defined]

    events = list(service.stream("thread-title-bg", _request("你好")))

    visible_ai_texts = [
        event.data.get("content")
        for event in events
        if event.type == "messages-tuple" and event.data.get("type") == "ai"
    ]
    assert visible_ai_texts == ["你好！有什么我可以帮你的？"]

    record = repository.get_thread("thread-title-bg")
    assert record is not None
    assert [message["type"] for message in record.values.messages] == ["human", "ai"]
    assert record.values.title == "中文问候对话标题"
    assert captured_generation_inputs == [
        {
            "thread_id": "thread-title-bg",
            "title_before": "Untitled",
            "message_count": 2,
        }
    ]

    search_results = repository.search(thread_id="thread-title-bg")
    assert search_results[0]["values"]["title"] == "中文问候对话标题"


def test_thread_service_preserves_existing_manual_title_during_follow_up_stream(tmp_path) -> None:
    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread(
        "thread-manual-title",
        title="手动重命名标题",
        values={
            "messages": [
                {
                    "type": "human",
                    "id": "human-1",
                    "content": [{"type": "text", "text": "你好"}],
                },
                {
                    "type": "ai",
                    "id": "ai-1",
                    "content": "你好！有什么我可以帮你的？",
                },
            ],
            "artifacts": [],
        },
    )

    class FakeClient:
        def stream(self, *args: Any, **kwargs: Any):
            yield StreamEvent(
                type="messages-tuple",
                data={"type": "ai", "id": "ai-2", "content": "继续回答"},
            )
            yield StreamEvent(
                type="values",
                data={
                    "title": "Untitled",
                    "messages": [
                        {
                            "type": "human",
                            "id": "human-1",
                            "content": [{"type": "text", "text": "你好"}],
                        },
                        {
                            "type": "ai",
                            "id": "ai-1",
                            "content": "你好！有什么我可以帮你的？",
                        },
                        {
                            "type": "human",
                            "id": "human-2",
                            "content": [{"type": "text", "text": "继续说"}],
                        },
                        {
                            "type": "ai",
                            "id": "ai-2",
                            "content": "继续回答",
                        },
                    ],
                    "artifacts": [],
                },
            )
            yield StreamEvent(type="end", data={"usage": {}})

    captured_generation_inputs: list[dict[str, Any]] = []

    def fake_generate(thread_id: str, values: dict[str, Any], context: dict[str, Any]) -> None:
        captured_generation_inputs.append(
            {
                "thread_id": thread_id,
                "title_before": values.get("title"),
                "message_count": len(values.get("messages", [])),
            }
        )

    service = ThreadService(repository=repository, client=FakeClient())
    service._queue_title_generation = fake_generate  # type: ignore[attr-defined]

    events = list(service.stream("thread-manual-title", _request("继续说")))

    values_titles = [
        event.data.get("title")
        for event in events
        if event.type == "values"
    ]
    assert values_titles == ["手动重命名标题"]

    record = repository.get_thread("thread-manual-title")
    assert record is not None
    assert record.values.title == "手动重命名标题"
    assert [message["type"] for message in record.values.messages] == [
        "human",
        "ai",
        "human",
        "ai",
    ]
    assert captured_generation_inputs == [
        {
            "thread_id": "thread-manual-title",
            "title_before": "手动重命名标题",
            "message_count": 4,
        }
    ]
