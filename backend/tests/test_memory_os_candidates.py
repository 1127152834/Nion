from pathlib import Path

from nion.memory_os.candidates import MemoryOSCandidateQueue
from nion.memory_os.models import CandidateRecord
from nion.memory_os.repository import MemoryOSRepository


def test_candidate_queue_round_trips_records(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    queue = MemoryOSCandidateQueue(repo)
    candidate = CandidateRecord(
        candidate_id="cand_01",
        proposed_domain="learning",
        proposed_subtype="topic",
        owner_type="agent",
        scope="user",
        memory_type="semantic",
        summary="用户反复询问财务表达。",
        raw_evidence_refs=["thread:abc#msg_2"],
        confidence=0.6,
        status="candidate",
        created_at="2026-04-04T00:00:00Z",
        expires_at="2026-04-18T00:00:00Z",
        producer="post_turn_extractor",
    )

    queue.push(candidate)
    rows = queue.list_pending()

    assert len(rows) == 1
    assert rows[0].candidate_id == "cand_01"
