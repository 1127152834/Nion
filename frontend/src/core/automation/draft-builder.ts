import type {
  AutomationDeliveryMode,
  AutomationJobCreateInput,
  AutomationJobKind,
  AutomationSchedulePreset,
} from "./types";

export type AutomationDraftCadence = Extract<
  AutomationSchedulePreset,
  "daily" | "weekdays" | "weekly"
>;

export type AutomationDraftInput = {
  kind: AutomationJobKind;
  name: string;
  prompt: string;
  cadence: AutomationDraftCadence;
  timeOfDay: string;
  timezone?: string;
  deliveryMode?: AutomationDeliveryMode;
  deliveryTargets?: Array<Record<string, unknown>>;
  skills?: string[];
  dayOfWeek?: number;
};

export function buildAutomationDraftRequest(
  input: AutomationDraftInput,
): AutomationJobCreateInput {
  const normalizedTimeOfDay = normalizeTimeOfDay(input.timeOfDay);
  const { hour, minute } = parseTimeOfDay(normalizedTimeOfDay);
  const timezone = input.timezone?.trim() ?? "UTC";
  const dayOfWeek =
    input.cadence === "weekly" ? normalizeDayOfWeek(input.dayOfWeek) : undefined;

  return {
    name: input.name.trim(),
    prompt: input.prompt.trim(),
    job_kind: input.kind,
    schedule_preset: input.cadence,
    schedule_kind: "cron",
    schedule_value: buildCronExpression({
      cadence: input.cadence,
      hour,
      minute,
      dayOfWeek,
    }),
    schedule_timezone: timezone,
    schedule_metadata: {
      time_of_day: normalizedTimeOfDay,
      ...(dayOfWeek !== undefined ? { day_of_week: dayOfWeek } : {}),
    },
    delivery_mode: input.deliveryMode ?? "local",
    delivery_targets: input.deliveryTargets ?? [],
    skills: input.skills ?? [],
  };
}

function buildCronExpression({
  cadence,
  hour,
  minute,
  dayOfWeek,
}: {
  cadence: AutomationDraftCadence;
  hour: number;
  minute: number;
  dayOfWeek?: number;
}) {
  if (cadence === "daily") {
    return `${minute} ${hour} * * *`;
  }
  if (cadence === "weekdays") {
    return `${minute} ${hour} * * 1-5`;
  }
  return `${minute} ${hour} * * ${dayOfWeek ?? 1}`;
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

function normalizeDayOfWeek(value: number | undefined) {
  if (value === undefined) {
    return 1;
  }
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    throw new Error("day_of_week must be between 0 and 6");
  }
  return value;
}
