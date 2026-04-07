from __future__ import annotations

from .models import CandidateRecord
from .repository import MemoryOSRepository


class MemoryOSCandidateQueue:
    def __init__(self, repository: MemoryOSRepository) -> None:
        self._repository = repository

    def push(self, candidate: CandidateRecord) -> CandidateRecord:
        return self._repository.save_candidate_record(candidate)

    def list_pending(self) -> list[CandidateRecord]:
        return self._repository.list_candidate_records()

    def remove(self, candidate_id: str) -> None:
        self._repository.delete_candidate_record(candidate_id)
