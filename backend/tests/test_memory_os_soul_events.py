from pathlib import Path

from nion.automation.models import AutomationJob
from nion.memory_os.repository import MemoryOSRepository


def test_soul_events_capture_journal_and_overlay_refresh(tmp_path: Path):
    from nion.memory_os.soul_reflection import reflect_soul_growth

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    result = reflect_soul_growth(
        repository=repo,
        base_dir=tmp_path,
        repeated_needs=["月底高压期需要低刺激支持"] * 3,
        evidence_days=2,
        created_at="2026-04-07T00:00:00Z",
    )

    events = [event.model_dump() for event in repo.list_soul_events()]
    event_types = {event["event_type"] for event in events}

    assert result["overlay_updated"] is True
    assert "adaptive_overlay_refreshed" in event_types
    assert "soul_journal_written" in event_types


def test_soul_events_capture_narrative_relationship_journal_and_automation_outputs(tmp_path: Path):
    from nion.memory_os.projections import record_soul_automation_created
    from nion.memory_os.relationship_soul import refresh_relationship_soul
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore
    from nion.memory_os.soul_transitions import promote_identity_narrative
    from nion.memory_os.soul_journal import write_soul_journal

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)

    repo.save_memory_record(
        {
            "memory_id": "rel_01",
            "domain": "relationship",
            "subtype": "initiative_policy",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好低打扰、少施压、结论先行的支持方式。",
            "confidence": 0.9,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    staged = store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是一个正在变得更稳的助手。\n",
        created_at="2026-04-07T00:00:00Z",
        staged=True,
    )
    refreshed = refresh_relationship_soul(repo, created_at="2026-04-07T00:01:00Z")
    journal_path = write_soul_journal(
        base_dir=tmp_path,
        repository=repo,
        repeated_needs=["月底高压期需要低刺激支持"] * 3,
        created_at="2026-04-07T00:02:00Z",
    )
    promoted = promote_identity_narrative(
        repo,
        staged_memory_id="agent_self_narrative_staged_main",
        created_at="2026-04-07T00:03:00Z",
    )
    job = AutomationJob(
        id="job_01",
        name="月底低打扰复盘提醒",
        prompt="在月底高压期发送低刺激复盘提醒。",
        schedule_kind="cron",
        schedule_value="0 9 * * 1",
        created_at="2026-04-07T00:04:00Z",
        updated_at="2026-04-07T00:04:00Z",
        owner_type="agent",
        owner_id="agent:main",
        mutability="pause_only",
        provenance_memory_id=str(refreshed["memory_record"]["memory_id"]),
        provenance_learning_id="learning_01",
    )
    record_soul_automation_created(
        repository=repo,
        job=job,
        created_at="2026-04-07T00:04:00Z",
    )

    events = [event.model_dump() for event in repo.list_soul_events()]
    event_types = [event["event_type"] for event in events]
    event_map = {event["event_type"]: event for event in events}

    assert staged["memory_record"]["memory_id"] == "agent_self_narrative_staged_main"
    assert refreshed["memory_record"]["subtype"] == "relationship_soul"
    assert journal_path.endswith("memory-os/artifacts/agent-self/soul-journal/2026/04/07/reflection_2026-04-07.md")
    assert promoted["memory_record"]["memory_id"] == "agent_self_narrative_main"
    assert event_types == [
        "soul_automation_created",
        "identity_narrative_promoted",
        "soul_journal_written",
        "relationship_soul_refreshed",
        "identity_narrative_staged",
    ]
    assert event_map["identity_narrative_staged"]["memory_id"] == "agent_self_narrative_staged_main"
    assert event_map["identity_narrative_promoted"]["related_memory_id"] == "agent_self_narrative_staged_main"
    assert event_map["relationship_soul_refreshed"]["memory_id"] == "soul_rel_user_default"
    assert event_map["soul_journal_written"]["metadata"]["journal_path"].endswith("reflection_2026-04-07.md")
    assert event_map["soul_automation_created"]["memory_id"] == "job_01"
    assert event_map["soul_automation_created"]["related_memory_id"] == "soul_rel_user_default"
    assert event_map["soul_automation_created"]["metadata"]["provenance_learning_id"] == "learning_01"
