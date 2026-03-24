from datetime import UTC, datetime

from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def test_daily_preset_builds_cron_and_timezone():
    from nion.automation.schedule_presets import build_schedule_fields

    schedule = build_schedule_fields(
        preset="daily",
        timezone="Asia/Shanghai",
        time_of_day="09:30",
    )

    assert schedule.schedule_kind == "cron"
    assert schedule.schedule_value == "30 9 * * *"
    assert schedule.schedule_timezone == "Asia/Shanghai"


def test_weekday_preset_skips_weekends():
    from nion.automation.schedule_presets import build_schedule_fields

    schedule = build_schedule_fields(
        preset="weekdays",
        timezone="Asia/Shanghai",
        time_of_day="18:00",
    )

    assert schedule.schedule_kind == "cron"
    assert schedule.schedule_value == "0 18 * * 1-5"
    assert schedule.schedule_timezone == "Asia/Shanghai"


def test_service_derives_low_level_schedule_from_friendly_fields(tmp_path):
    repository = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repository, lock_timeout_seconds=300)
    service = AutomationService(
        repository=repository,
        scheduler=scheduler,
        clock=lambda: _dt("2026-03-24T01:07:00Z"),
    )

    job = service.create_job(
        {
            "name": "Morning reminder",
            "prompt": "Remind me to review priorities",
            "job_kind": "reminder",
            "schedule_preset": "daily",
            "schedule_timezone": "Asia/Shanghai",
            "schedule_metadata": {"time_of_day": "09:30"},
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    assert job.job_kind == "reminder"
    assert job.schedule_preset == "daily"
    assert job.schedule_kind == "cron"
    assert job.schedule_value == "30 9 * * *"
    assert job.next_run_at == "2026-03-24T01:30:00Z"
