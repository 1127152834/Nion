from __future__ import annotations

from pathlib import Path

from nion.config.paths import Paths
from nion.memory_os.clock import utcnow_z
from nion.orchestration.models import ChildRunRecord


class ChildRunRepository:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)

    def _path(self, thread_id: str, child_run_id: str) -> Path:
        return self._paths.child_run_file(thread_id, child_run_id)

    def save(self, record: ChildRunRecord) -> ChildRunRecord:
        path = self._path(record.parent_thread_id, record.child_run_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(record.model_dump_json(indent=2), encoding="utf-8")
        return record

    def get(self, thread_id: str, child_run_id: str) -> ChildRunRecord:
        return ChildRunRecord.model_validate_json(
            self._path(thread_id, child_run_id).read_text(encoding="utf-8")
        )

    def list_for_thread(self, thread_id: str) -> list[ChildRunRecord]:
        root = self._paths.child_runs_dir(thread_id)
        if not root.exists():
            return []
        return sorted(
            (
                ChildRunRecord.model_validate_json(path.read_text(encoding="utf-8"))
                for path in root.glob("*.json")
            ),
            key=lambda item: item.started_at or item.child_run_id,
        )

    def list_open_for_thread(self, thread_id: str) -> list[ChildRunRecord]:
        return [item for item in self.list_for_thread(thread_id) if item.status != "closed"]

    def close(self, thread_id: str, child_run_id: str) -> ChildRunRecord:
        record = self.get(thread_id, child_run_id)
        updated = record.model_copy(
            update={"status": "closed", "finished_at": record.finished_at or utcnow_z()}
        )
        return self.save(updated)
