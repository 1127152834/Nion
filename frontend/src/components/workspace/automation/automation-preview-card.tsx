"use client";

import type { AutomationScheduleDefinition } from "@/core/automation/schedule-definition";
import type { AutomationJobKind } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type AutomationPreviewCardProps = {
  kind: Extract<AutomationJobKind, "reminder" | "scheduled_task">;
  schedule: AutomationScheduleDefinition;
};

export function AutomationPreviewCard({
  kind,
  schedule,
}: AutomationPreviewCardProps) {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.forms;

  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="text-sm font-medium">{copy.previewLabel}</div>
      <div className="text-muted-foreground mt-2 space-y-1 text-sm">
        <div>{describeSchedule(schedule)}</div>
        <div>
          {kind === "scheduled_task"
            ? copy.previewTaskHint
            : copy.previewReminderHint}
        </div>
      </div>
    </div>
  );
}

function describeSchedule(schedule: AutomationScheduleDefinition) {
  if (schedule.preset === "once") {
    return `Runs once at ${schedule.runAt}`;
  }
  if (schedule.preset === "daily") {
    return `Runs every day at ${schedule.timeOfDay}`;
  }
  if (schedule.preset === "weekdays") {
    return `Runs every weekday at ${schedule.timeOfDay}`;
  }
  if (schedule.preset === "weekly") {
    return `Runs on ${formatWeekdays(schedule.weekdays)} at ${schedule.timeOfDay}`;
  }
  if (schedule.preset === "interval") {
    return `Runs every ${schedule.intervalMinutes} minutes`;
  }
  if (schedule.preset === "cron") {
    return `Runs on custom schedule: ${schedule.cronExpression}`;
  }
  return "Runs on a custom schedule";
}

function formatWeekdays(weekdays: number[]) {
  return weekdays
    .map((weekday) => WEEKDAY_LABELS[weekday] ?? String(weekday))
    .join(", ");
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
