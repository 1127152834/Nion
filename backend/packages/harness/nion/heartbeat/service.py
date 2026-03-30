from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from nion.config.paths import Paths
from nion.heartbeat.models import HeartbeatStatus
from nion.heartbeat.store import HeartbeatStore


class HeartbeatService:
    def __init__(self, *, base_dir: str | Path | None = None) -> None:
        paths = Paths(base_dir=base_dir)
        self._store = HeartbeatStore(paths.telemetry_db_file)
        self._bot_id = "local-agent"

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
        updated = current.model_copy(
            update={
                "running": False,
                "last_tick_at": now,
                "last_tick_status": "idle",
                "last_tick_summary": "Heartbeat tick completed",
            }
        )
        self._store.save_status(updated)
        self._store.append_log(
            bot_id=self._bot_id,
            status="idle",
            summary="Heartbeat tick completed",
            started_at=now,
            finished_at=now,
            details={"session_count_since_last_tick": current.session_count_since_last_tick},
        )
        return True
