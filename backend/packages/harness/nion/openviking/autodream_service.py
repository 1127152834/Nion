from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from nion.openviking.autodream_models import DreamEntry
from nion.self_maintenance.service import SelfMaintenanceService


@dataclass(frozen=True)
class AutoDreamResult:
    entry: DreamEntry
    entry_path: Path
    agent_memory_updates: list[str]
    user_memory_candidates: list[str]
    action_proposals: list[str]


class AutoDreamService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._base_dir = base_dir

    def run(self, *, query: str, manual: bool = False) -> AutoDreamResult:
        result = SelfMaintenanceService(base_dir=self._base_dir).run(
            trigger="manual" if manual else "heartbeat",
            query=query,
        )
        entry = DreamEntry(
            dream_id=result.entry.run_id,
            started_at=result.entry.started_at,
            ended_at=result.entry.ended_at,
            time_window_start=result.entry.started_at,
            time_window_end=result.entry.ended_at,
            summary=result.entry.summary,
            what_i_did=result.entry.what_i_did,
            what_i_learned=result.entry.what_i_learned,
            what_changed=[],
            what_i_plan_to_change=result.entry.action_proposals,
            what_i_changed=[],
            stale_items=result.entry.stale_items,
            agent_memory_updates=result.memory_update_proposals,
            user_memory_candidates=[],
            action_proposals=result.action_proposals,
            sources=result.entry.sources,
        )
        return AutoDreamResult(
            entry=entry,
            entry_path=Path(result.entry_path),
            agent_memory_updates=result.memory_update_proposals,
            user_memory_candidates=[],
            action_proposals=result.action_proposals,
        )
