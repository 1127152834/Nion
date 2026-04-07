from pathlib import Path

from nion.memory_os.candidates import MemoryOSCandidateQueue
from nion.memory_os.consolidation import MemoryOSConsolidationEngine
from nion.memory_os.models import CandidateRecord
from nion.memory_os.repository import MemoryOSRepository


def test_consolidation_engine_promotes_candidate_to_memory_record(tmp_path: Path):
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
            summary="用户偏好先给结论。",
            raw_evidence_refs=["thread:1#msg_1"],
            confidence=0.8,
            status="candidate",
            created_at="2026-04-04T00:00:00Z",
            expires_at="2026-04-18T00:00:00Z",
            producer="extractor",
        )
    )

    engine = MemoryOSConsolidationEngine(repo)
    result = engine.run_once()

    records = repo.list_memory_records(domain="user_model", status="active")
    assert result["records_created"] == 1
    assert any("先给结论" in record["summary"] for record in records)
