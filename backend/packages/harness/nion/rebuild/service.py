from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from nion.config.paths import Paths
from nion.memory_os.builtin_provider import BuiltinMemoryProvider
from nion.rebuild.models import RebuildResult
from nion.rebuild.store import RebuildStore


class RebuildService:
    def __init__(self, *, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)
        self._store = RebuildStore(self._paths.telemetry_db_file)
        self._memory_provider = BuiltinMemoryProvider(base_dir=base_dir)

    def rebuild(self) -> dict[str, object]:
        payload = self._memory_provider.get_memory()
        facts = payload.get("facts", [])
        source_count = len(facts)

        # Current Nion canonical source is the structured memory payload itself.
        self._memory_provider.save_memory(payload)

        now = datetime.now(UTC).isoformat()
        summary = "Rebuilt structured memory runtime from canonical payload"
        self._store.append_log(
            status="succeeded",
            summary=summary,
            source_count=source_count,
            restored_count=source_count,
            skipped_count=0,
            started_at=now,
            completed_at=now,
            details={"canonical_source": "structured_memory_payload"},
        )

        return RebuildResult(
            status="succeeded",
            summary=summary,
            source_count=source_count,
            restored_count=source_count,
            skipped_count=0,
        ).model_dump()

    def list_logs(self, *, limit: int = 50, offset: int = 0):
        return self._store.list_logs(limit=limit, offset=offset)

    def delete_logs(self) -> None:
        self._store.delete_logs()

    def status(self) -> dict[str, object]:
        logs = self._store.count_logs()
        return {
            "rebuild_logs_count": logs,
            "last_rebuild_source": "structured_memory_payload",
        }
