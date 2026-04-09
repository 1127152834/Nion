from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_repository_round_trips_soul_events(tmp_path: Path):
    from nion.memory_os.soul_events import SoulEventRecord

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    event = SoulEventRecord(
        event_id="soul_evt_01",
        event_type="adaptive_overlay_refreshed",
        memory_id="soul_overlay_active_main",
        summary="当前临时表达模式已更新。",
        created_at="2026-04-07T00:00:00Z",
    )

    repo.save_soul_event(event)
    rows = repo.list_soul_events()

    assert len(rows) == 1
    assert rows[0].event_type == "adaptive_overlay_refreshed"
    assert rows[0].memory_id == "soul_overlay_active_main"
    assert rows[0].related_memory_id is None
    assert rows[0].metadata == {}


def test_repository_lists_latest_soul_events_first(tmp_path: Path):
    from nion.memory_os.soul_events import SoulEventRecord

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_soul_event(
        SoulEventRecord(
            event_id="soul_evt_01",
            event_type="relationship_soul_refreshed",
            memory_id="soul_rel_user_default",
            summary="关系基调已刷新。",
            created_at="2026-04-06T00:00:00Z",
        )
    )
    repo.save_soul_event(
        SoulEventRecord(
            event_id="soul_evt_02",
            event_type="adaptive_overlay_refreshed",
            memory_id="soul_overlay_active_main",
            summary="当前临时表达模式已更新。",
            created_at="2026-04-07T00:00:00Z",
        )
    )

    rows = repo.list_soul_events()

    assert rows[0].event_id == "soul_evt_02"
    assert rows[1].event_id == "soul_evt_01"


def test_repository_round_trips_rich_soul_event_metadata(tmp_path: Path):
    from nion.memory_os.soul_events import SoulEventRecord

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_soul_event(
        SoulEventRecord(
            event_id="soul_evt_rich",
            event_type="soul_automation_created",
            memory_id="job_01",
            related_memory_id="soul_overlay_active_main",
            summary="因为稳定的关系变化，创建低打扰提醒自动化。",
            created_at="2026-04-07T01:00:00Z",
            actor="agent:main",
            source="automation_projection",
            metadata={
                "job_id": "job_01",
                "provenance_memory_id": "soul_overlay_active_main",
                "provenance_learning_id": "learning_01",
            },
        )
    )

    rows = repo.list_soul_events()

    assert rows[0].event_type == "soul_automation_created"
    assert rows[0].related_memory_id == "soul_overlay_active_main"
    assert rows[0].actor == "agent:main"
    assert rows[0].source == "automation_projection"
    assert rows[0].metadata["provenance_learning_id"] == "learning_01"
