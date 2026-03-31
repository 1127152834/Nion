from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from nion.self_maintenance.models import (
    ReflectiveRunState,
    SelfMaintenanceTickResult,
)
from nion.self_maintenance.policy import should_run_reflective_maintenance
from nion.self_maintenance.service import SelfMaintenanceService
from nion.self_maintenance.store import SelfMaintenanceStore


class SelfMaintenanceScheduler:
    def __init__(
        self,
        *,
        base_dir: str | Path | None = None,
        service: SelfMaintenanceService | None = None,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self._store = SelfMaintenanceStore(base_dir=base_dir)
        self._service = service or SelfMaintenanceService(base_dir=base_dir)
        self._now = now or (lambda: datetime.now(UTC))

    def load_state(self) -> ReflectiveRunState:
        return self._store.load_state()

    def update_state(self, state: ReflectiveRunState) -> None:
        self._store.save_state(state)

    def record_session_completed(self) -> ReflectiveRunState:
        state = self.load_state()
        updated = ReflectiveRunState(
            last_run_at=state.last_run_at,
            session_count_since_last_run=state.session_count_since_last_run + 1,
            running=state.running,
            last_run_status=state.last_run_status,
            last_run_summary=state.last_run_summary,
            last_query=state.last_query,
        )
        self.update_state(updated)
        return updated

    def status(self) -> dict[str, object]:
        state = self.load_state()
        return {
            "running": state.running,
            "last_run_at": state.last_run_at,
            "last_run_status": state.last_run_status,
            "last_run_summary": state.last_run_summary,
            "session_count_since_last_run": state.session_count_since_last_run,
            "next_eligibility_hint": self._build_next_eligibility_hint(state),
        }

    def tick(self) -> SelfMaintenanceTickResult:
        state = self.load_state()
        if state.running:
            return SelfMaintenanceTickResult(
                ran=False,
                status="running",
                summary="Reflective self-maintenance is already running.",
            )
        if not should_run_reflective_maintenance(
            last_run_at=state.last_run_at,
            session_count_since_last_run=state.session_count_since_last_run,
            now=self._now().isoformat(),
        ):
            return SelfMaintenanceTickResult(
                ran=False,
                status="idle",
                summary="Reflective self-maintenance is not eligible yet.",
            )

        query = "recent memory drift"
        self.update_state(
            ReflectiveRunState(
                last_run_at=state.last_run_at,
                session_count_since_last_run=state.session_count_since_last_run,
                running=True,
                last_run_status=state.last_run_status,
                last_run_summary=state.last_run_summary,
                last_query=query,
            )
        )
        try:
            result = self._service.run(trigger="heartbeat", query=query)
        except Exception:
            self.update_state(
                ReflectiveRunState(
                    last_run_at=state.last_run_at,
                    session_count_since_last_run=state.session_count_since_last_run,
                    running=False,
                    last_run_status="failed",
                    last_run_summary=state.last_run_summary,
                    last_query=query,
                )
            )
            raise

        completed_at = getattr(result.entry, "ended_at", self._now().isoformat())
        summary = getattr(result.entry, "summary", "Reflective self-maintenance completed.")
        self.update_state(
            ReflectiveRunState(
                last_run_at=completed_at,
                session_count_since_last_run=0,
                running=False,
                last_run_status="succeeded",
                last_run_summary=summary,
                last_query=query,
            )
        )
        return SelfMaintenanceTickResult(
            ran=True,
            status="succeeded",
            summary=summary,
            result=result,
        )

    def _build_next_eligibility_hint(self, state: ReflectiveRunState) -> str:
        if state.running:
            return "Reflective self-maintenance is currently running."
        if state.session_count_since_last_run < 5:
            remaining = 5 - state.session_count_since_last_run
            return (
                f"Needs {remaining} more completed sessions before reflective maintenance can run."
            )
        if state.last_run_at is None:
            return "Reflective maintenance can run on the next idle heartbeat poll."
        if should_run_reflective_maintenance(
            last_run_at=state.last_run_at,
            session_count_since_last_run=state.session_count_since_last_run,
            now=self._now().isoformat(),
        ):
            return "Reflective maintenance can run on the next idle heartbeat poll."
        return "Waiting for the 24-hour cooldown window before reflective maintenance can run again."
