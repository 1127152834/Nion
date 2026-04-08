from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def _seed_learning(repo: MemoryOSRepository) -> tuple[str, str]:
    memory_id = "learn_projection_01"
    revision_id = f"{memory_id}:rev:1"
    repo.save_memory_record(
        {
            "memory_id": memory_id,
            "domain": "learning",
            "subtype": "topic",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "月底高压期需要低刺激支持。",
            "confidence": 0.85,
            "created_at": "2026-04-09T00:00:00Z",
            "updated_at": "2026-04-09T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": f"learning:topic:{memory_id}",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "learning",
            "status": "active",
            "summary": "月底高压期需要低刺激支持。",
            "created_at": "2026-04-09T00:00:00Z",
            "updated_at": "2026-04-09T00:00:00Z",
            "metadata": {
                "domain": "learning",
                "subtype": "topic",
                "title": "低刺激支持策略",
            },
        }
    )
    repo.save_memory_revision(
        {
            "revision_id": revision_id,
            "memory_id": memory_id,
            "revision_number": 1,
            "summary": "月底高压期需要低刺激支持。",
            "evidence_ref": None,
            "created_at": "2026-04-09T00:00:00Z",
            "payload": {
                "domain": "learning",
                "subtype": "topic",
                "title": "低刺激支持策略",
            },
        }
    )
    return memory_id, revision_id


def test_project_learning_outputs_creates_procedure_and_automation_links(tmp_path: Path):
    from nion.memory.projections.service import project_learning_outputs

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    learning_id, learning_revision_id = _seed_learning(repo)

    result = project_learning_outputs(
        repository=repo,
        learning_memory_id=learning_id,
        created_at="2026-04-09T00:00:00Z",
    )

    procedure = result["procedure"]
    automation = result["automation_projection"]
    soul_input = result["soul_reflection_input"]

    assert procedure["memory_id"].startswith("proc_")
    assert procedure["provenance"]["source_memory_id"] == learning_id
    assert procedure["provenance"]["source_revision_id"] == learning_revision_id
    assert automation["job_id"].startswith("job_learning_projection_")
    assert automation["provenance_memory_id"] == procedure["memory_id"]
    assert automation["provenance_learning_id"] == learning_id
    assert automation["source_revision_id"] == learning_revision_id
    assert soul_input["learning_memory_id"] == learning_id
    assert soul_input["learning_revision_id"] == learning_revision_id
    assert soul_input["procedure_memory_id"] == procedure["memory_id"]


def test_project_learning_outputs_records_compatible_soul_event(tmp_path: Path):
    from nion.memory.projections.service import project_learning_outputs

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    learning_id, learning_revision_id = _seed_learning(repo)

    result = project_learning_outputs(
        repository=repo,
        learning_memory_id=learning_id,
        created_at="2026-04-09T00:00:00Z",
    )

    soul_events = repo.list_soul_events()
    automation_event = next(event for event in soul_events if event.event_type == "soul_automation_created")

    assert automation_event.memory_id == result["automation_projection"]["job_id"]
    assert automation_event.related_memory_id == result["procedure"]["memory_id"]
    assert automation_event.metadata["provenance_learning_id"] == learning_id
    assert automation_event.metadata["provenance_learning_revision_id"] == learning_revision_id
    assert automation_event.metadata["procedure_memory_id"] == result["procedure"]["memory_id"]
