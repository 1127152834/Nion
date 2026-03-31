from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from nion.config.paths import Paths
from nion.heartbeat.models import HeartbeatStatus
from nion.heartbeat.store import HeartbeatStore
from nion.self_maintenance.models import SelfMaintenanceTickResult


class HeartbeatService:
    def __init__(
        self,
        *,
        base_dir: str | Path | None = None,
        run_maintenance: Callable[[], SelfMaintenanceTickResult | bool] | None = None,
    ) -> None:
        paths = Paths(base_dir=base_dir)
        self._store = HeartbeatStore(paths.telemetry_db_file)
        self._bot_id = "local-agent"
        self._run_maintenance = run_maintenance or (lambda: False)

    def status(self) -> dict[str, object]:
        return self._store.load_status().model_dump()

    def list_logs(self, *, limit: int = 50, offset: int = 0):
        return self._store.list_logs(bot_id=self._bot_id, limit=limit, offset=offset)

    def delete_logs(self) -> None:
        self._store.delete_logs(bot_id=self._bot_id)

    def record_session_completed(self) -> HeartbeatStatus:
        current = self._store.load_status()
        updated = current.model_copy(
            update={
                "session_count_since_last_tick": current.session_count_since_last_tick + 1,
            }
        )
        self._store.save_status(updated)
        return updated

    def tick(self) -> bool:
        now = datetime.now(UTC).isoformat()
        current = self._store.load_status()
        maintenance_result = self._run_maintenance()
        maintenance_triggered = True
        if isinstance(maintenance_result, SelfMaintenanceTickResult):
            summary = maintenance_result.summary
            status_value = maintenance_result.status
            maintenance_ran = maintenance_result.ran
        else:
            maintenance_ran = bool(maintenance_result)
            summary = (
                "Heartbeat tick ran maintenance cycle"
                if maintenance_ran
                else "Heartbeat tick completed"
            )
            status_value = "succeeded" if maintenance_ran else "idle"
        updated = current.model_copy(
            update={
                "running": False,
                "last_tick_at": now,
                "last_tick_status": status_value,
                "last_tick_summary": summary,
            }
        )
        self._store.save_status(updated)
        self._store.append_log(
            bot_id=self._bot_id,
            status=status_value,
            summary=summary,
            started_at=now,
            finished_at=now,
            details={
                "session_count_since_last_tick": current.session_count_since_last_tick,
                "maintenance_triggered": maintenance_triggered,
                "maintenance_result": maintenance_ran,
                "maintenance_status": status_value,
                "maintenance_summary": summary,
            },
        )
        return True
