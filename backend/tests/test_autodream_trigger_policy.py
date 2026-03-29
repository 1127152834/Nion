from nion.openviking.autodream_policy import should_run_autodream


def test_autodream_requires_time_and_activity_threshold():
    assert should_run_autodream(last_run_at=None, session_count_since_last_run=6) is True
    assert (
        should_run_autodream(
            last_run_at="2026-03-30T00:00:00Z",
            now="2026-03-30T12:00:00Z",
            session_count_since_last_run=6,
        )
        is False
    )
    assert (
        should_run_autodream(
            last_run_at="2026-03-29T00:00:00Z",
            now="2026-03-30T12:00:00Z",
            session_count_since_last_run=2,
        )
        is False
    )
