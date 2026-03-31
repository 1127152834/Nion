import type { AutomationJobCreateInput } from "./types";

export type AutomationScheduleDefinition =
  | {
      preset: "once";
      timezone: string;
      runAt: string;
    }
  | {
      preset: "daily" | "weekdays";
      timezone: string;
      timeOfDay: string;
    }
  | {
      preset: "weekly";
      timezone: string;
      timeOfDay: string;
      weekdays: number[];
    }
  | {
      preset: "interval";
      timezone: string;
      intervalMinutes: number;
    }
  | {
      preset: "cron";
      timezone: string;
      cronExpression: string;
    };

type NonWeeklyRecurringSchedule = Extract<
  AutomationScheduleDefinition,
  { preset: "daily" | "weekdays" }
>;

export function buildScheduleRequestFields(
  input: AutomationScheduleDefinition,
): Pick<
  AutomationJobCreateInput,
  | "schedule_preset"
  | "schedule_kind"
  | "schedule_value"
  | "schedule_timezone"
  | "schedule_metadata"
> {
  const timezone = normalizeTimezone(input.timezone);

  if (input.preset === "once") {
    return {
      schedule_preset: "once",
      schedule_kind: "once",
      schedule_value: input.runAt,
      schedule_timezone: timezone,
      schedule_metadata: {
        run_at: input.runAt,
      },
    };
  }

  if (input.preset === "interval") {
    return {
      schedule_preset: "interval",
      schedule_kind: "interval",
      schedule_value: String(input.intervalMinutes * 60),
      schedule_timezone: timezone,
      schedule_metadata: {
        interval_minutes: input.intervalMinutes,
      },
    };
  }

  if (input.preset === "cron") {
    return {
      schedule_preset: "cron",
      schedule_kind: "cron",
      schedule_value: input.cronExpression,
      schedule_timezone: timezone,
      schedule_metadata: {
        cron_expression: input.cronExpression,
      },
    };
  }

  const timeOfDay = normalizeTimeOfDay(input.timeOfDay);
  const { hour, minute } = parseTimeOfDay(timeOfDay);

  if (input.preset === "daily") {
    return {
      schedule_preset: "daily",
      schedule_kind: "cron",
      schedule_value: `${minute} ${hour} * * *`,
      schedule_timezone: timezone,
      schedule_metadata: {
        time_of_day: timeOfDay,
      },
    };
  }

  if (input.preset === "weekdays") {
    return {
      schedule_preset: "weekdays",
      schedule_kind: "cron",
      schedule_value: `${minute} ${hour} * * 1-5`,
      schedule_timezone: timezone,
      schedule_metadata: {
        time_of_day: timeOfDay,
        weekdays: [1, 2, 3, 4, 5],
      },
    };
  }

  if (input.preset === "weekly") {
    const weekdays = normalizeWeekdays(input.weekdays);
    return {
      schedule_preset: "weekly",
      schedule_kind: "cron",
      schedule_value: `${minute} ${hour} * * ${weekdays.join(",")}`,
      schedule_timezone: timezone,
      schedule_metadata: {
        time_of_day: timeOfDay,
        weekdays,
      },
    };
  }

  const exhaustiveCheck: never = input as never;
  throw new Error(`Unsupported schedule preset: ${String(exhaustiveCheck)}`);
}

function normalizeTimezone(value: string | undefined) {
  return value?.trim() ?? "UTC";
}

function normalizeTimeOfDay(value: string) {
  const { hour, minute } = parseTimeOfDay(value);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeOfDay(value: string) {
  const [hourText, minuteText] = value.split(":", 2);
  const hour = Number.parseInt(hourText ?? "", 10);
  const minute = Number.parseInt(minuteText ?? "", 10);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("time_of_day must use HH:MM 24-hour format");
  }

  return { hour, minute };
}

function normalizeWeekdays(value: number[]) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("weekdays must contain at least one day");
  }

  const normalized = value.map((day) => {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new Error("weekday must be between 0 and 6");
    }
    return day;
  });

  return Array.from(new Set(normalized)).sort((left, right) => left - right);
}
