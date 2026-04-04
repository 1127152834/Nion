from __future__ import annotations

import uuid
from datetime import UTC, datetime

from .models import ConsolidationEvent
from .repository import MemoryOSRepository


class MemoryOSConsolidationEngine:
    def __init__(self, repository: MemoryOSRepository) -> None:
        self._repository = repository

    def run_once(self) -> dict[str, int]:
        candidates = self._repository.list_candidate_records()
        created = 0
        affected_ids: list[str] = []
        for candidate in candidates:
            memory_id = f"mem_{uuid.uuid4().hex[:10]}"
            self._repository.save_memory_record(
                {
                    "memory_id": memory_id,
                    "domain": candidate.proposed_domain,
                    "subtype": candidate.proposed_subtype,
                    "owner_type": candidate.owner_type,
                    "scope": candidate.scope,
                    "memory_type": candidate.memory_type,
                    "subject_id": "user:default",
                    "status": "active",
                    "summary": candidate.summary,
                    "confidence": candidate.confidence,
                    "created_at": candidate.created_at,
                    "updated_at": candidate.created_at,
                    "provenance": {
                        "source_type": "candidate",
                        "generated_by": "memory_os_consolidation",
                        "source_candidate_id": candidate.candidate_id,
                    },
                }
            )
            self._repository.delete_candidate_record(candidate.candidate_id)
            created += 1
            affected_ids.append(memory_id)

        event = ConsolidationEvent(
            event_id=f"cons_{uuid.uuid4().hex[:10]}",
            input_candidate_ids=[],
            affected_memory_ids=affected_ids,
            action="activate",
            notes="M3 minimal consolidation run",
            created_at=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            executor="memory_os_heartbeat",
        )
        self._repository.save_consolidation_event(event)
        return {"records_created": created}
