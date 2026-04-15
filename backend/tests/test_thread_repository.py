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
