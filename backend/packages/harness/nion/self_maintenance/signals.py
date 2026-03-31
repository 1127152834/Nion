from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, Field

from nion.compaction.service import CompactionService
from nion.config.paths import Paths
from nion.heartbeat.service import HeartbeatService
from nion.memory_os.service import MemoryOSService
from nion.rebuild.service import RebuildService
from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallSearchResult


class SelfMaintenanceSignals(BaseModel):
    heartbeat_status: dict[str, object]
    memory_runtime: dict[str, object]
    memory_usage: dict[str, object]
    recent_compaction_summaries: list[str] = Field(default_factory=list)
    recent_rebuild_summaries: list[str] = Field(default_factory=list)
    recall_results: list[RecallSearchResult] = Field(default_factory=list)


def collect_self_maintenance_signals(
    *,
    base_dir: str | Path | None = None,
    query: str,
) -> SelfMaintenanceSignals:
    paths = Paths(base_dir=base_dir)
    heartbeat_service = HeartbeatService(base_dir=base_dir)
    memory_service = MemoryOSService()
    compaction_service = CompactionService(base_dir=base_dir)
    rebuild_service = RebuildService(base_dir=base_dir)
    recall_archive = LocalRecallArchive(paths.recall_db_file)

    return SelfMaintenanceSignals(
        heartbeat_status=heartbeat_service.status(),
        memory_runtime=memory_service.get_memory_runtime_status(base_dir=base_dir),
        memory_usage=memory_service.get_memory_usage(base_dir=base_dir),
        recent_compaction_summaries=[
            item.summary for item in compaction_service.list_logs(limit=5, offset=0)
        ],
        recent_rebuild_summaries=[
            item.summary for item in rebuild_service.list_logs(limit=5, offset=0)
        ],
        recall_results=recall_archive.search_global(query, limit=5),
    )
