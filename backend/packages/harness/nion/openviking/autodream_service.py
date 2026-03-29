from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from nion.openviking.autodream_models import DreamEntry
from nion.openviking.autodream_signals import collect_autodream_signals
from nion.openviking.autodream_store import AutoDreamStore


@dataclass(frozen=True)
class AutoDreamResult:
    entry: DreamEntry
    entry_path: Path
    agent_memory_updates: list[str]
    user_memory_candidates: list[str]
    action_proposals: list[str]


class AutoDreamService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._store = AutoDreamStore(base_dir=base_dir)
        self._base_dir = base_dir

    def run(self, *, query: str, manual: bool = False) -> AutoDreamResult:
        ended_at = datetime.now(UTC)
        started_at = ended_at - timedelta(minutes=1)
        signals = collect_autodream_signals(base_dir=self._base_dir, query=query)

        notebook_count = len(signals.notebook_items)
        recall_count = len(signals.recall_results)
        summary = (
            f"Consolidated {notebook_count} notebook signals and {recall_count} recall signals."
        )

        agent_memory_updates = []
        if notebook_count > 0:
            agent_memory_updates.append(
                "Keep notebook-derived context provenance explicit during retrieval assembly."
            )

        action_proposals = []
        if notebook_count > 0:
            action_proposals.append("Continue refining the multi-domain context assembly flow.")

        entry = DreamEntry(
            dream_id=f"dream_{uuid4().hex[:8]}",
            started_at=started_at.isoformat(),
            ended_at=ended_at.isoformat(),
            time_window_start=(ended_at - timedelta(days=1)).isoformat(),
            time_window_end=ended_at.isoformat(),
            summary=summary,
            what_i_did=[
                "Collected recent notebook and recall signals.",
            ],
            what_i_learned=[
                f"Notebook signals: {notebook_count}; recall signals: {recall_count}.",
            ],
            what_changed=[],
            what_i_plan_to_change=action_proposals,
            what_i_changed=[],
            stale_items=[],
            agent_memory_updates=agent_memory_updates,
            user_memory_candidates=[],
            action_proposals=action_proposals,
            sources=["recall", "notebook"],
        )
        entry_path = self._store.write_entry(entry)
        return AutoDreamResult(
            entry=entry,
            entry_path=entry_path,
            agent_memory_updates=agent_memory_updates,
            user_memory_candidates=[],
            action_proposals=action_proposals,
        )
