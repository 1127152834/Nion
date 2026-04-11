from __future__ import annotations

from nion.orchestration.repository import ChildRunRepository


class ChildRunService:
    def __init__(self, repository: ChildRunRepository | None = None) -> None:
        self._repository = repository or ChildRunRepository()

    def list_open(self, thread_id: str):
        return self._repository.list_open_for_thread(thread_id)

    def get(self, thread_id: str, child_run_id: str):
        return self._repository.get(thread_id, child_run_id)

    def close(self, thread_id: str, child_run_id: str):
        return self._repository.close(thread_id, child_run_id)
