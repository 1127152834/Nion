"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AutomationScheduleDefinition } from "@/core/automation/schedule-definition";
import { useI18n } from "@/core/i18n/hooks";

import { AutomationDateTimePicker } from "./automation-date-time-picker";

type ScheduleBuilderProps = {
  value: AutomationScheduleDefinition;
  onChange: (next: AutomationScheduleDefinition) => void;
};

export function ScheduleBuilder({ value, onChange }: ScheduleBuilderProps) {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.forms;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-medium" id="schedule-builder-cadence-label">
          {copy.cadenceLabel}
        </label>
        <Select
          value={value.preset}
          onValueChange={(preset) =>
            onChange(buildSchedulePreset(preset as AutomationScheduleDefinition["preset"], value))
          }
        >
          <SelectTrigger aria-labelledby="schedule-builder-cadence-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="once">{copy.cadenceOptions.once}</SelectItem>
            <SelectItem value="daily">{copy.cadenceOptions.daily}</SelectItem>
            <SelectItem value="weekdays">{copy.cadenceOptions.weekdays}</SelectItem>
            <SelectItem value="weekly">{copy.cadenceOptions.weekly}</SelectItem>
            <SelectItem value="interval">{copy.cadenceOptions.interval}</SelectItem>
            <SelectItem value="cron">{copy.cadenceOptions.custom}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.preset === "once" ? (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="schedule-builder-run-at">
            {copy.dateTimeLabel}
          </label>
          <AutomationDateTimePicker
            id="schedule-builder-run-at"
            value={value.runAt}
            onChange={(next) =>
              onChange({
                ...value,
                runAt: next,
              })
            }
          />
        </div>
      ) : null}

      {value.preset === "daily" || value.preset === "weekdays" || value.preset === "weekly" ? (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="schedule-builder-time">
            {copy.timeLabel}
          </label>
          <Input
            id="schedule-builder-time"
            type="time"
            value={value.timeOfDay}
            onChange={(event) =>
              onChange({
                ...value,
                timeOfDay: event.target.value,
              })
            }
          />
        </div>
      ) : null}

      {value.preset === "weekly" ? (
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">{copy.weekdayLabel}</label>
          <div className="flex flex-wrap gap-2">
            {copy.weekdayOptions.map((label, index) => {
              const selected = value.weekdays.includes(index);
              return (
                <button
                  key={label}
                  type="button"
                  className={
                    selected
                      ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm"
                      : "rounded-full border px-3 py-1 text-sm text-muted-foreground"
                  }
                  onClick={() =>
                    onChange({
                      ...value,
                      weekdays: toggleWeekday(value.weekdays, index),
                    })
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {value.preset === "interval" ? (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="schedule-builder-interval">
            {copy.intervalLabel}
          </label>
          <Input
            id="schedule-builder-interval"
            type="number"
            min="1"
            value={String(value.intervalMinutes)}
            onChange={(event) =>
              onChange({
                ...value,
                intervalMinutes: Number.parseInt(event.target.value || "1", 10),
              })
            }
          />
        </div>
      ) : null}

      {value.preset === "cron" ? (
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="schedule-builder-cron">
            {copy.customScheduleLabel}
          </label>
          <Input
            id="schedule-builder-cron"
            value={value.cronExpression}
            onChange={(event) =>
              onChange({
                ...value,
                cronExpression: event.target.value,
              })
            }
            placeholder={copy.customSchedulePlaceholder}
          />
        </div>
      ) : null}
    </div>
  );
}

function buildSchedulePreset(
  preset: AutomationScheduleDefinition["preset"],
  previous: AutomationScheduleDefinition,
): AutomationScheduleDefinition {
  const timezone = previous.timezone;
  if (preset === "once") {
    return {
      preset,
      timezone,
      runAt:
        previous.preset === "once"
          ? previous.runAt
          : new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    };
  }
  if (preset === "daily" || preset === "weekdays") {
    return {
      preset,
      timezone,
      timeOfDay: readTimeOfDay(previous),
    };
  }
  if (preset === "weekly") {
    return {
      preset,
      timezone,
      timeOfDay: readTimeOfDay(previous),
      weekdays: previous.preset === "weekly" ? previous.weekdays : [1],
    };
  }
  if (preset === "interval") {
    return {
      preset,
      timezone,
      intervalMinutes: previous.preset === "interval" ? previous.intervalMinutes : 60,
    };
  }
  return {
    preset: "cron",
    timezone,
    cronExpression: previous.preset === "cron" ? previous.cronExpression : "0 9 * * 1-5",
  };
}

function readTimeOfDay(previous: AutomationScheduleDefinition) {
  if (
    previous.preset === "daily" ||
    previous.preset === "weekdays" ||
    previous.preset === "weekly"
  ) {
    return previous.timeOfDay;
  }
  return "09:00";
}

function toggleWeekday(current: number[], day: number) {
  if (current.includes(day)) {
    const next = current.filter((value) => value !== day);
    return next.length > 0 ? next : current;
  }
  return [...current, day].sort((left, right) => left - right);
}
