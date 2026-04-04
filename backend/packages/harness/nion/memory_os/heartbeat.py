from __future__ import annotations

from pathlib import Path

from .candidates import MemoryOSCandidateQueue
from .consolidation import MemoryOSConsolidationEngine
from .diary import MemoryOSDiaryWriter
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
        return {
            "candidates_consumed": len(pending),
            "records_created": result["records_created"],
            "diary_written": True,
        }
