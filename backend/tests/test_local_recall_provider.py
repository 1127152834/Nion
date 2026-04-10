from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallQueryRequest, RecallTurn
from nion.recall.providers.local_transcript import LocalTranscriptRecallProvider


def test_local_recall_provider_returns_normalized_items(tmp_path) -> None:
    archive = LocalRecallArchive(tmp_path / "recall.db")
    archive.append_turns(
        thread_id="thread-1",
        agent_name="lead_agent",
        turns=[
            RecallTurn(role="human", content="We chose backend-host execution."),
            RecallTurn(role="ai", content="Yes, backend-host execution stays."),
        ],
    )
    provider = LocalTranscriptRecallProvider(archive=archive)

    result = provider.query(
        RecallQueryRequest(
            thread_id="thread-1",
            query="backend-host",
            max_items=5,
        )
    )

    assert result.items
    assert result.items[0].source == "local"
    assert result.items[0].thread_id == "thread-1"
    assert "backend-host execution" in result.items[0].summary


def test_local_recall_provider_returns_deterministic_fallback_when_empty(tmp_path) -> None:
    archive = LocalRecallArchive(tmp_path / "recall.db")
    provider = LocalTranscriptRecallProvider(archive=archive)

    result = provider.query(
        RecallQueryRequest(
            thread_id="thread-404",
            query="missing topic",
            max_items=5,
        )
    )

    assert len(result.items) == 1
    assert result.items[0].kind == "no_match"
    assert result.items[0].score == 0.0
    assert "No matching local recall" in result.items[0].summary
