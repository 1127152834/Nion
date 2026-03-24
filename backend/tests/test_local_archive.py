from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallTurn


def test_archive_appends_and_searches_globally(tmp_path):
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    archive.append_turns(
        thread_id="thread-123",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="human",
                content="Deploy the staging worker",
                source_message_id="h-1",
            ),
            RecallTurn(
                role="ai",
                content="We fixed staging by rotating the token.",
                source_message_id="ai-1",
            ),
        ],
    )

    results = archive.search_global("rotating token", limit=3)

    assert len(results) == 1
    assert results[0].thread_id == "thread-123"
    assert "rotating the token" in results[0].snippet


def test_search_thread_scopes_results(tmp_path):
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    archive.append_turns(
        thread_id="thread-a",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="Thread A rotated the staging token.",
                source_message_id="ai-a",
            )
        ],
    )
    archive.append_turns(
        thread_id="thread-b",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="Thread B rotated the production token.",
                source_message_id="ai-b",
            )
        ],
    )

    results = archive.search_thread("thread-a", "rotated token", limit=5)

    assert len(results) == 1
    assert results[0].thread_id == "thread-a"


def test_archive_ignores_duplicate_source_message_ids(tmp_path):
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    turns = [
        RecallTurn(
            role="human",
            content="Remember the rollback plan",
            source_message_id="h-1",
        ),
        RecallTurn(
            role="ai",
            content="We pinned the previous image tag.",
            source_message_id="ai-1",
        ),
    ]

    archive.append_turns(thread_id="thread-1", agent_name="lead_agent", turns=turns)
    archive.append_turns(thread_id="thread-1", agent_name="lead_agent", turns=turns)

    results = archive.search_global("previous image tag", limit=5)
    assert len(results) == 1
