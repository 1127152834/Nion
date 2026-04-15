from nion.threads.repository import ThreadRepository


def test_thread_repository_round_trips_metadata(tmp_path) -> None:
    repo = ThreadRepository(base_dir=tmp_path)
    repo.upsert_thread("thread-1", title="Hello")
    threads = repo.search(limit=10)
    assert threads[0]["thread_id"] == "thread-1"
    assert threads[0]["values"]["title"] == "Hello"


def test_thread_repository_filters_by_thread_id(tmp_path) -> None:
    repo = ThreadRepository(base_dir=tmp_path)
    repo.upsert_thread("thread-1", title="Hello")
    repo.upsert_thread("thread-2", title="World")

    threads = repo.search(thread_id="thread-2", limit=10)

    assert [thread["thread_id"] for thread in threads] == ["thread-2"]


def test_thread_repository_preserves_chat_message_queue_state(tmp_path) -> None:
    repo = ThreadRepository(base_dir=tmp_path)

    repo.update_state(
        "thread-1",
        {
            "queued_messages": [
                {
                    "id": "queue-1",
                    "threadId": "thread-1",
                    "text": "next question",
                    "status": "queued",
                    "createdAt": "2026-04-15T08:00:00.000Z",
                    "files": [
                        {
                            "filename": "diagram.png",
                            "size": 1200,
                            "path": "/mnt/user-data/uploads/diagram.png",
                            "artifactUrl": "/api/threads/thread-1/artifacts/mnt/user-data/uploads/diagram.png",
                            "mediaType": "image/png",
                            "status": "uploaded",
                        }
                    ],
                    "message": {
                        "text": "next question",
                        "files": [],
                    },
                    "extraContext": {"surface": "chat"},
                }
            ]
        },
    )

    record = repo.get_thread("thread-1")

    assert record is not None
    assert record.values.model_dump()["queued_messages"][0]["id"] == "queue-1"
    assert record.values.model_dump()["queued_messages"][0]["files"][0]["artifactUrl"].endswith(
        "diagram.png"
    )
