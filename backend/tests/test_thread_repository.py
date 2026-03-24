from nion.threads.repository import ThreadRepository


def test_thread_repository_round_trips_metadata(tmp_path) -> None:
    repo = ThreadRepository(base_dir=tmp_path)
    repo.upsert_thread("thread-1", title="Hello")
    threads = repo.search(limit=10)
    assert threads[0]["thread_id"] == "thread-1"
    assert threads[0]["values"]["title"] == "Hello"
