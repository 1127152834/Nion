from __future__ import annotations

from pathlib import Path

from .candidates import MemoryOSCandidateQueue
from .consolidation import MemoryOSConsolidationEngine
from .diary import MemoryOSDiaryWriter
from .growth_orchestrator import run_growth_orchestrator
from .repository import MemoryOSRepository


class MemoryOSHeartbeat:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        db_path = Path(base_dir or ".") / "memory-os" / "index.sqlite3"
        self._repository = MemoryOSRepository(db_path)
        self._queue = MemoryOSCandidateQueue(self._repository)
        self._diary = MemoryOSDiaryWriter(base_dir=base_dir)
        self._consolidation = MemoryOSConsolidationEngine(self._repository)

    def run_micro_cycle(self) -> dict[str, object]:
        pending = self._queue.list_pending()
        result = self._consolidation.run_once()
        self._diary.write_entry(
            thread_id="heartbeat",
            summary="Memory OS micro cycle completed.",
            repeated_needs=[candidate.summary for candidate in pending],
        )
        growth_result = run_growth_orchestrator(
            repository=self._repository,
            base_dir=self._repository._db_path.parent.parent,
            created_at="2026-04-06T00:00:00Z",
            repeated_needs=[candidate.summary for candidate in pending],
            evidence_days=2 if len(pending) >= 3 else 1,
        )
        return {
            "candidates_consumed": len(pending),
            "records_created": result["records_created"],
            "diary_written": True,
            "soul_journal_written": True,
            "soul_proposal_created": bool(growth_result["soul"]["proposal_created"]),
        }
