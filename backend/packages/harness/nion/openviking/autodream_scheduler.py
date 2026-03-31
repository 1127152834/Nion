from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from nion.openviking.autodream_models import AutoDreamRunState
from nion.openviking.autodream_service import AutoDreamService
from nion.self_maintenance.policy import should_run_reflective_maintenance
from nion.self_maintenance.scheduler import SelfMaintenanceScheduler


class AutoDreamScheduler:
    def __init__(
        self,
        *,
        base_dir: str | Path | None = None,
        service: AutoDreamService | None = None,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self._scheduler = SelfMaintenanceScheduler(
            base_dir=base_dir,
            service=None if service is None else _LegacyAutoDreamServiceAdapter(service),
            now=now,
        )
        self._now = now or (lambda: datetime.now(UTC))

    def load_state(self) -> AutoDreamRunState:
        state = self._scheduler.load_state()
        return AutoDreamRunState.model_validate(state.model_dump())

    def update_state(self, state: AutoDreamRunState) -> None:
        self._scheduler.update_state(state)

    def status(self) -> dict[str, object]:
        status = self._scheduler.status()
        return {
            **status,
            "next_eligibility_hint": _legacy_hint(str(status["next_eligibility_hint"])),
        }

    def record_session_completed(self) -> AutoDreamRunState:
        state = self._scheduler.record_session_completed()
        return AutoDreamRunState.model_validate(state.model_dump())

    def tick(self) -> bool:
        return self._scheduler.tick().ran

    def _build_next_eligibility_hint(self, state: AutoDreamRunState) -> str:
        if state.running:
            return "AutoDream is currently running."
        if state.session_count_since_last_run < 5:
            remaining = 5 - state.session_count_since_last_run
            return f"Needs {remaining} more completed sessions before AutoDream can run."
        if state.last_run_at is None:
            return "AutoDream can run on the next idle scheduler poll."
        if should_run_reflective_maintenance(
            last_run_at=state.last_run_at,
            session_count_since_last_run=state.session_count_since_last_run,
            now=self._now().isoformat(),
        ):
            return "AutoDream can run on the next idle scheduler poll."
        return "Waiting for the 24-hour cooldown window before AutoDream can run again."


class _LegacyAutoDreamServiceAdapter:
    def __init__(self, service: AutoDreamService) -> None:
        self._service = service

    def run(self, *, trigger: str, query: str):
        return self._service.run(query=query, manual=(trigger == "manual"))


def _legacy_hint(value: str) -> str:
    return (
        value.replace("Reflective self-maintenance", "AutoDream")
        .replace("reflective maintenance", "AutoDream")
    )
