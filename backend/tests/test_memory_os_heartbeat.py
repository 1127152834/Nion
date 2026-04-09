from pathlib import Path

from nion.memory_os.candidates import MemoryOSCandidateQueue
from nion.memory_os.heartbeat import MemoryOSHeartbeat
from nion.memory_os.models import CandidateRecord
from nion.memory_os.repository import MemoryOSRepository


def test_heartbeat_consumes_candidates_and_writes_diary(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    queue = MemoryOSCandidateQueue(repo)
    queue.push(
        CandidateRecord(
            candidate_id="cand_01",
            proposed_domain="user_model",
            proposed_subtype="communication_preference",
            owner_type="agent",
            scope="user",
            memory_type="semantic",
            summary="用户偏好直接表达。",
            raw_evidence_refs=["thread:1#msg_1"],
            confidence=0.8,
            status="candidate",
            created_at="2026-04-04T00:00:00Z",
            expires_at="2026-04-18T00:00:00Z",
            producer="extractor",
        )
    )

    heartbeat = MemoryOSHeartbeat(base_dir=tmp_path)
    report = heartbeat.run_micro_cycle()

    assert report["candidates_consumed"] == 1
    assert report["records_created"] == 1
    assert report["diary_written"] is True


def test_heartbeat_writes_soul_journal_and_updates_overlay_on_threshold(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    queue = MemoryOSCandidateQueue(repo)
    for index in range(3):
        queue.push(
            CandidateRecord(
                candidate_id=f"cand_{index}",
                proposed_domain="relationship",
                proposed_subtype="warmth_preference",
                owner_type="agent",
                scope="user",
                memory_type="semantic",
                summary="月底高压期需要低刺激支持",
                raw_evidence_refs=[f"thread:{index}#msg_1"],
                confidence=0.8,
                status="candidate",
                created_at="2026-04-04T00:00:00Z",
                expires_at="2026-04-18T00:00:00Z",
                producer="extractor",
            )
        )

    heartbeat = MemoryOSHeartbeat(base_dir=tmp_path)
    report = heartbeat.run_micro_cycle()

    soul_records = repo.list_memory_records(domain="soul")

    assert report["soul_journal_written"] is True
    assert report["soul_overlay_updated"] is True
    assert any(item["subtype"] == "adaptive_overlay" for item in soul_records)
