from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_repository_round_trips_soul_events(tmp_path: Path):
    from nion.memory_os.soul_events import SoulEventRecord

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    event = SoulEventRecord(
        event_id="soul_evt_01",
        event_type="proposal_accepted",
        memory_id="soul_prop_01",
        summary="接受了减少鼓励式措辞的灵魂提案。",
        created_at="2026-04-07T00:00:00Z",
    )

    repo.save_soul_event(event)
    rows = repo.list_soul_events()

    assert len(rows) == 1
    assert rows[0].event_type == "proposal_accepted"
    assert rows[0].memory_id == "soul_prop_01"


def test_repository_lists_latest_soul_events_first(tmp_path: Path):
    from nion.memory_os.soul_events import SoulEventRecord

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_soul_event(
        SoulEventRecord(
            event_id="soul_evt_01",
            event_type="proposal_rejected",
            memory_id="soul_prop_old",
            summary="拒绝了旧提案。",
            created_at="2026-04-06T00:00:00Z",
        )
    )
    repo.save_soul_event(
        SoulEventRecord(
            event_id="soul_evt_02",
            event_type="overlay_rollback",
            memory_id="soul_overlay_active_main",
            summary="回退到了上一版稳定人格层。",
            created_at="2026-04-07T00:00:00Z",
        )
    )

    rows = repo.list_soul_events()

    assert rows[0].event_id == "soul_evt_02"
    assert rows[1].event_id == "soul_evt_01"
