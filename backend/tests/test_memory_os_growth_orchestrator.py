from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_growth_orchestrator_projects_learning_procedure_and_automation(tmp_path: Path):
    from nion.memory_os.growth_orchestrator import run_growth_orchestrator

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    report = run_growth_orchestrator(
        repository=repo,
        base_dir=tmp_path,
        created_at="2026-04-09T00:00:00Z",
        repeated_needs=["月底高压期需要低刺激支持"] * 3,
        evidence_days=3,
    )

    learning_records = repo.list_memory_records(domain="learning")
    procedure_records = repo.list_memory_records(domain="procedure")
    soul_events = repo.list_soul_events()
    event_types = {event.event_type for event in soul_events}
    automation_event = next(event for event in soul_events if event.event_type == "soul_automation_created")

    assert report["learning_created"] is True
    assert report["procedure_created"] is True
    assert report["automation_projected"] is True
    assert len(learning_records) == 1
    assert len(procedure_records) == 1
    assert "soul_journal_written" in event_types
    assert "soul_automation_created" in event_types
    assert automation_event.metadata["provenance_learning_id"] == learning_records[0]["memory_id"]
