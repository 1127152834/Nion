from datetime import UTC, datetime

from nion.openviking.autodream_models import AutoDreamRunState
from nion.openviking.autodream_scheduler import AutoDreamScheduler


class _FakeService:
    def __init__(self):
        self.calls = 0

    def run(self, *, query: str, manual: bool = False):
        self.calls += 1
        return type(
            "Result",
            (),
            {
                "entry": type("Entry", (), {"summary": "dreamed"})(),
            },
        )()


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def test_scheduler_runs_only_when_policy_is_satisfied(tmp_path):
    service = _FakeService()
    scheduler = AutoDreamScheduler(
        base_dir=tmp_path,
        service=service,
        now=lambda: _dt("2026-03-31T12:00:00Z"),
    )

    scheduler.update_state(
        AutoDreamRunState(
            last_run_at="2026-03-30T00:00:00Z",
            session_count_since_last_run=5,
        )
    )

    did_run = scheduler.tick()

    assert did_run is True
    assert service.calls == 1


def test_scheduler_skips_when_not_enough_sessions(tmp_path):
    service = _FakeService()
    scheduler = AutoDreamScheduler(
        base_dir=tmp_path,
        service=service,
        now=lambda: _dt("2026-03-31T12:00:00Z"),
    )

    scheduler.update_state(
        AutoDreamRunState(
            last_run_at="2026-03-30T00:00:00Z",
            session_count_since_last_run=2,
        )
    )

    did_run = scheduler.tick()

    assert did_run is False
    assert service.calls == 0


def test_scheduler_status_includes_last_run_metadata(tmp_path):
    scheduler = AutoDreamScheduler(
        base_dir=tmp_path,
        now=lambda: _dt("2026-03-31T12:00:00Z"),
    )
    scheduler.update_state(
        AutoDreamRunState(
            last_run_at="2026-03-30T12:00:00Z",
            session_count_since_last_run=4,
            running=False,
            last_run_status="succeeded",
            last_run_summary="Consolidated recent notebook and recall signals.",
            last_query="recent project work",
        )
    )

    status = scheduler.status()

    assert status["running"] is False
    assert status["last_run_at"] == "2026-03-30T12:00:00Z"
    assert status["last_run_status"] == "succeeded"
    assert status["last_run_summary"] == "Consolidated recent notebook and recall signals."
    assert status["session_count_since_last_run"] == 4
    assert status["next_eligibility_hint"] == "Needs 1 more completed sessions before AutoDream can run."


def test_scheduler_tick_does_not_double_run_while_marked_running(tmp_path):
    service = _FakeService()
    scheduler = AutoDreamScheduler(
        base_dir=tmp_path,
        service=service,
        now=lambda: _dt("2026-03-31T12:00:00Z"),
    )
    scheduler.update_state(
        AutoDreamRunState(
            last_run_at="2026-03-30T00:00:00Z",
            session_count_since_last_run=8,
            running=True,
            last_query="recent project work",
        )
    )

    did_run = scheduler.tick()

    assert did_run is False
    assert service.calls == 0


def test_scheduler_tick_persists_summary_and_resets_counter(tmp_path):
    service = _FakeService()
    scheduler = AutoDreamScheduler(
        base_dir=tmp_path,
        service=service,
        now=lambda: _dt("2026-03-31T12:00:00Z"),
    )
    scheduler.update_state(
        AutoDreamRunState(
            last_run_at="2026-03-30T00:00:00Z",
            session_count_since_last_run=5,
        )
    )

    did_run = scheduler.tick()
    state = scheduler.load_state()

    assert did_run is True
    assert state.running is False
    assert state.session_count_since_last_run == 0
    assert state.last_run_status == "succeeded"
    assert state.last_run_summary == "dreamed"
    assert state.last_query == "recent memory drift"
