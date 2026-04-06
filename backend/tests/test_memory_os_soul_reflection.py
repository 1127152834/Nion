from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_soul_reflection_creates_journal_and_proposal_for_repeated_needs(tmp_path: Path):
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
    proposal = next(item for item in records if item["subtype"] == "proposal")

    assert result["journal_path"].endswith("memory-os/artifacts/agent-self/soul-journal/2026/04/06/reflection_2026-04-06.md")
    assert proposal["status"] == "candidate"
    assert "低刺激支持" in proposal["summary"]


def test_soul_reflection_does_not_create_proposal_without_threshold(tmp_path: Path):
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

    assert result["proposal_created"] is False
    assert records == []
