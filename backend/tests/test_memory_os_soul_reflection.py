from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_soul_reflection_creates_journal_and_overlay_for_repeated_needs(tmp_path: Path):
    from nion.memory_os.soul_reflection import reflect_soul_growth

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    result = reflect_soul_growth(
        repository=repo,
        base_dir=tmp_path,
        repeated_needs=[
            "月底高压期需要低刺激支持",
            "月底高压期需要低刺激支持",
            "月底高压期需要低刺激支持",
        ],
        evidence_days=2,
        created_at="2026-04-06T00:00:00Z",
    )

    records = repo.list_memory_records(domain="soul")
    overlay = next(item for item in records if item["subtype"] == "adaptive_overlay")

    assert result["journal_path"].endswith("memory-os/artifacts/agent-self/soul-journal/2026/04/06/reflection_2026-04-06.md")
    assert result["overlay_updated"] is True
    assert overlay["status"] == "active"
    assert "低刺激支持" in overlay["summary"]
    events = repo.list_soul_events()
    assert any(event.event_type == "soul_journal_written" for event in events)
    assert any(event.event_type == "adaptive_overlay_refreshed" for event in events)


def test_soul_reflection_does_not_create_overlay_without_threshold(tmp_path: Path):
    from nion.memory_os.soul_reflection import reflect_soul_growth

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    result = reflect_soul_growth(
        repository=repo,
        base_dir=tmp_path,
        repeated_needs=["今天情绪有点低落"],
        evidence_days=1,
        created_at="2026-04-06T00:00:00Z",
    )

    records = repo.list_memory_records(domain="soul")

    assert result["overlay_updated"] is False
    assert records == []


def test_soul_reflection_skips_duplicate_overlay_refresh(tmp_path: Path):
    from nion.memory_os.soul_reflection import reflect_soul_growth

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    first = reflect_soul_growth(
        repository=repo,
        base_dir=tmp_path,
        repeated_needs=["月底高压期需要低刺激支持"] * 3,
        evidence_days=2,
        created_at="2026-04-06T00:00:00Z",
    )
    second = reflect_soul_growth(
        repository=repo,
        base_dir=tmp_path,
        repeated_needs=["月底高压期需要低刺激支持"] * 3,
        evidence_days=3,
        created_at="2026-04-07T00:00:00Z",
    )

    overlays = [
        item for item in repo.list_memory_records(domain="soul") if item["subtype"] == "adaptive_overlay"
    ]
    event_types = [event.event_type for event in repo.list_soul_events()]

    assert first["overlay_updated"] is True
    assert second["overlay_updated"] is False
    assert len(overlays) == 1
    assert event_types.count("adaptive_overlay_refreshed") == 1
