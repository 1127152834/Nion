from __future__ import annotations

from .models import AccessLogEntry
from .repository import MemoryOSRepository


class MemoryOSAccessLogger:
    def __init__(self, repository: MemoryOSRepository) -> None:
        self._repository = repository

    def record(self, entry: AccessLogEntry) -> AccessLogEntry:
        return self._repository.save_access_log(entry)
