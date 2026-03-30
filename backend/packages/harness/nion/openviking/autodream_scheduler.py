from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from nion.openviking.autodream_models import AutoDreamRunState
from nion.openviking.autodream_policy import should_run_autodream
from nion.openviking.autodream_service import AutoDreamService
from nion.openviking.autodream_store import AutoDreamStore


class AutoDreamScheduler:
    def __init__(
        self,
        *,
        base_dir: str | Path | None = None,
        service: AutoDreamService | None = None,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self._store = AutoDreamStore(base_dir=base_dir)
        self._service = service or AutoDreamService(base_dir=base_dir)
        self._now = now or (lambda: datetime.now(UTC))

    def load_state(self) -> AutoDreamRunState:
        return self._store.load_state()

    def update_state(self, state: AutoDreamRunState) -> None:
        self._store.save_state(state)

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

    def record_session_completed(self) -> AutoDreamRunState:
        state = self.load_state()
        updated = AutoDreamRunState(
            last_run_at=state.last_run_at,
            session_count_since_last_run=state.session_count_since_last_run + 1,
            running=state.running,
            last_run_status=state.last_run_status,
            last_run_summary=state.last_run_summary,
            last_query=state.last_query,
        )
        self.update_state(updated)
        return updated

    def tick(self) -> bool:
        state = self.load_state()
        if state.running:
            return False
        if not should_run_autodream(
            last_run_at=state.last_run_at,
            session_count_since_last_run=state.session_count_since_last_run,
            now=self._now().isoformat(),
        ):
            return False

        query = "recent project work"
        self.update_state(
            AutoDreamRunState(
                last_run_at=state.last_run_at,
                session_count_since_last_run=state.session_count_since_last_run,
                running=True,
                last_run_status=state.last_run_status,
                last_run_summary=state.last_run_summary,
                last_query=query,
            )
        )
        try:
            result = self._service.run(query=query, manual=False)
        except Exception:
            self.update_state(
                AutoDreamRunState(
                    last_run_at=state.last_run_at,
                    session_count_since_last_run=state.session_count_since_last_run,
                    running=False,
                    last_run_status="failed",
                    last_run_summary=state.last_run_summary,
                    last_query=query,
                )
            )
            raise

        self.update_state(
            AutoDreamRunState(
                last_run_at=self._now().isoformat(),
                session_count_since_last_run=0,
                running=False,
                last_run_status="succeeded",
                last_run_summary=result.entry.summary,
                last_query=query,
            )
        )
        return True

    def _build_next_eligibility_hint(self, state: AutoDreamRunState) -> str:
        if state.running:
            return "AutoDream is currently running."
        if state.session_count_since_last_run < 5:
            remaining = 5 - state.session_count_since_last_run
            return f"Needs {remaining} more completed sessions before AutoDream can run."
        if state.last_run_at is None:
            return "AutoDream can run on the next idle scheduler poll."
        if should_run_autodream(
            last_run_at=state.last_run_at,
            session_count_since_last_run=state.session_count_since_last_run,
            now=self._now().isoformat(),
        ):
            return "AutoDream can run on the next idle scheduler poll."
        return "Waiting for the 24-hour cooldown window before AutoDream can run again."
