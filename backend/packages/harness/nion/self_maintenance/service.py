from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from nion.self_maintenance.models import (
    ReflectiveEntry,
    ReflectiveRunState,
    SelfMaintenanceResult,
)
from nion.self_maintenance.signals import collect_self_maintenance_signals
from nion.self_maintenance.store import SelfMaintenanceStore


class SelfMaintenanceService:
    def __init__(self, *, base_dir: str | Path | None = None) -> None:
        self._base_dir = base_dir
        self._store = SelfMaintenanceStore(base_dir=base_dir)

    def run(self, *, trigger: str, query: str) -> SelfMaintenanceResult:
        started_at = datetime.now(UTC)
        signals = collect_self_maintenance_signals(base_dir=self._base_dir, query=query)
        ended_at = datetime.now(UTC)

        heartbeat_status = signals.heartbeat_status
        memory_runtime = signals.memory_runtime
        memory_usage = signals.memory_usage
        recall_count = len(signals.recall_results)

        what_i_did = [
            "Reviewed recent heartbeat status and maintenance cadence.",
            "Inspected structured memory runtime status and usage.",
            "Compared recent compaction and rebuild summaries.",
        ]
        if recall_count:
            what_i_did.append(f"Inspected {recall_count} recent recall matches for the query.")

        what_i_learned = [
            f"Heartbeat status: {heartbeat_status.get('last_tick_status', 'unknown')}.",
            f"Memory runtime provider: {memory_runtime.get('provider', 'unknown')}.",
            f"Structured memory fact count: {memory_runtime.get('facts_count', 0)}.",
            f"Structured memory item count estimate: {memory_usage.get('count', 0)}.",
        ]

        memory_update_proposals: list[str] = []
        prune_proposals: list[str] = []
        action_proposals: list[str] = []
        self_upgrade_proposals: list[str] = []

        if signals.recent_compaction_summaries:
            memory_update_proposals.append(
                "Review whether recent compaction outputs should be folded into longer-lived memory summaries."
            )
        if signals.recent_rebuild_summaries:
            action_proposals.append(
                "Keep rebuild as a manual recovery action and avoid promoting it to an always-on maintenance step."
            )
        if recall_count:
            action_proposals.append(
                "Use recall evidence to validate memory updates before promoting them into durable memory."
            )
        if int(memory_runtime.get("facts_count", 0) or 0) > 0 and recall_count == 0:
            prune_proposals.append(
                "Inspect stale structured memory facts that are no longer reinforced by recent recall activity."
            )
        self_upgrade_proposals.append(
            "Evolve reflective maintenance into a richer self-upgrade planner after provider parity improves."
        )

        summary = (
            f"Reviewed heartbeat, memory runtime, and {recall_count} recall signals "
            "to prepare bounded maintenance proposals."
        )

        entry = ReflectiveEntry(
            run_id=f"reflective_{uuid4().hex[:8]}",
            trigger=trigger,
            started_at=started_at.isoformat(),
            ended_at=ended_at.isoformat(),
            summary=summary,
            what_i_did=what_i_did,
            what_i_learned=what_i_learned,
            stale_items=[],
            memory_update_proposals=memory_update_proposals,
            prune_proposals=prune_proposals,
            action_proposals=action_proposals,
            self_upgrade_proposals=self_upgrade_proposals,
            sources=[
                "heartbeat",
                "memory_runtime",
                "memory_usage",
                "compaction_logs",
                "rebuild_logs",
                "recall",
            ],
        )
        entry_path = self._store.write_entry(entry)
        self._store.append_log(
            trigger=trigger,
            status="succeeded",
            summary=entry.summary,
            started_at=entry.started_at,
            completed_at=entry.ended_at,
            memory_update_proposals=entry.memory_update_proposals,
            prune_proposals=entry.prune_proposals,
            action_proposals=entry.action_proposals,
            self_upgrade_proposals=entry.self_upgrade_proposals,
            sources=entry.sources,
            entry_path=str(entry_path),
        )
        self._store.save_state(
            ReflectiveRunState(
                last_run_at=entry.ended_at,
                session_count_since_last_run=0,
                running=False,
                last_run_status="succeeded",
                last_run_summary=entry.summary,
                last_query=query,
            )
        )

        return SelfMaintenanceResult(
            entry=entry,
            entry_path=str(entry_path),
            memory_update_proposals=entry.memory_update_proposals,
            prune_proposals=entry.prune_proposals,
            action_proposals=entry.action_proposals,
            self_upgrade_proposals=entry.self_upgrade_proposals,
        )
