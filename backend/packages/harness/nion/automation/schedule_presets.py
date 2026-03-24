from dataclasses import dataclass

from nion.automation.models import AutomationScheduleKind, AutomationSchedulePreset


@dataclass(frozen=True)
class ScheduleFields:
    schedule_kind: AutomationScheduleKind
    schedule_value: str
    schedule_timezone: str
    schedule_metadata: dict[str, object]


def build_schedule_fields(
    *,
    preset: AutomationSchedulePreset | str,
    timezone: str,
    time_of_day: str | None = None,
    interval_minutes: int | None = None,
    weekdays: list[int] | None = None,
    day_of_week: int | None = None,
    run_at: str | None = None,
    cron_expression: str | None = None,
) -> ScheduleFields:
    normalized_timezone = timezone or "UTC"

    if preset == "once":
        if not run_at:
            raise ValueError("run_at is required for once preset")
        return ScheduleFields(
            schedule_kind="once",
            schedule_value=run_at,
            schedule_timezone=normalized_timezone,
            schedule_metadata={"run_at": run_at},
        )

    if preset == "interval":
        if interval_minutes is None:
            raise ValueError("interval_minutes is required for interval preset")
        return ScheduleFields(
            schedule_kind="interval",
            schedule_value=str(int(interval_minutes) * 60),
            schedule_timezone=normalized_timezone,
            schedule_metadata={"interval_minutes": int(interval_minutes)},
        )

    if preset == "cron":
        if not cron_expression:
            raise ValueError("cron_expression is required for cron preset")
        return ScheduleFields(
            schedule_kind="cron",
            schedule_value=cron_expression,
            schedule_timezone=normalized_timezone,
            schedule_metadata={"cron_expression": cron_expression},
        )

    hour, minute = _parse_time_of_day(time_of_day)

    if preset == "daily":
        return ScheduleFields(
            schedule_kind="cron",
            schedule_value=f"{minute} {hour} * * *",
            schedule_timezone=normalized_timezone,
            schedule_metadata={"time_of_day": time_of_day or ""},
        )

    if preset == "weekdays":
        return ScheduleFields(
            schedule_kind="cron",
            schedule_value=f"{minute} {hour} * * 1-5",
            schedule_timezone=normalized_timezone,
            schedule_metadata={"time_of_day": time_of_day or "", "weekdays": [1, 2, 3, 4, 5]},
        )

    if preset == "weekly":
        if weekdays:
            weekday_values = weekdays
        elif day_of_week is not None:
            weekday_values = [int(day_of_week)]
        else:
            weekday_values = [1]
        weekday_expression = ",".join(str(value) for value in weekday_values)
        return ScheduleFields(
            schedule_kind="cron",
            schedule_value=f"{minute} {hour} * * {weekday_expression}",
            schedule_timezone=normalized_timezone,
            schedule_metadata={"time_of_day": time_of_day or "", "weekdays": weekday_values},
        )

    raise ValueError(f"Unsupported schedule preset: {preset}")


def infer_schedule_preset(schedule_kind: AutomationScheduleKind | str | None) -> AutomationSchedulePreset:
    if schedule_kind == "once":
        return "once"
    if schedule_kind == "cron":
        return "cron"
    return "interval"


def _parse_time_of_day(value: str | None) -> tuple[int, int]:
    if not value:
        raise ValueError("time_of_day is required for this preset")
    try:
        hour_text, minute_text = value.split(":", maxsplit=1)
        hour = int(hour_text)
        minute = int(minute_text)
    except ValueError as exc:
        raise ValueError("time_of_day must use HH:MM format") from exc
    if hour not in range(24) or minute not in range(60):
        raise ValueError("time_of_day must be a valid 24-hour time")
    return hour, minute
