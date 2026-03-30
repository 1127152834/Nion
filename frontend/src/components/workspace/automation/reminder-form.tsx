"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildAutomationDraftRequest,
} from "@/core/automation/draft-builder";
import type { AutomationScheduleDefinition } from "@/core/automation/schedule-definition";
import type { AutomationJobCreateInput } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type ReminderFormProps = {
  isPending: boolean;
  onSubmit: (input: AutomationJobCreateInput) => Promise<void>;
};

export function ReminderForm({ isPending, onSubmit }: ReminderFormProps) {
  const { t } = useI18n();
  const settingsCopy = t.settings.automation;
  const copy = t.settings.automationWorkspace.forms;
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cadence, setCadence] = useState<"once" | "daily" | "weekdays" | "weekly">("daily");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [runAt, setRunAt] = useState("");

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  async function handleSubmit() {
    if (!name.trim() || !prompt.trim()) {
      return;
    }

    const schedule: AutomationScheduleDefinition =
      cadence === "once"
        ? {
            preset: "once",
            timezone,
            runAt: normalizeDateTimeLocal(runAt),
          }
        : cadence === "weekly"
          ? {
              preset: "weekly",
              timezone,
              timeOfDay,
              weekdays: [1],
            }
          : {
              preset: cadence,
              timezone,
              timeOfDay,
            };

    await onSubmit(
      buildAutomationDraftRequest({
        kind: "reminder",
        name,
        prompt,
        schedule,
      }),
    );

    setName("");
    setPrompt("");
    setRunAt("");
  }

  return (
    <Card className="gap-4 py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle>{copy.reminderTitle}</CardTitle>
        <CardDescription>{copy.reminderDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="reminder-name">
            {settingsCopy.nameLabel}
          </label>
          <Input
            id="reminder-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={settingsCopy.namePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" id="reminder-cadence-label">
            {copy.cadenceLabel}
          </label>
            <Select
              value={cadence}
              onValueChange={(value) =>
                setCadence(value as "once" | "daily" | "weekdays" | "weekly")
              }
            >
            <SelectTrigger aria-labelledby="reminder-cadence-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once">{copy.cadenceOptions.once}</SelectItem>
              <SelectItem value="daily">{copy.cadenceOptions.daily}</SelectItem>
              <SelectItem value="weekdays">
                {copy.cadenceOptions.weekdays}
              </SelectItem>
              <SelectItem value="weekly">{copy.cadenceOptions.weekly}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="reminder-prompt">
            {settingsCopy.promptLabel}
          </label>
          <Textarea
            id="reminder-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={settingsCopy.promptPlaceholder}
            className="min-h-24"
          />
        </div>
        {cadence === "once" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="reminder-run-at">
              {copy.dateTimeLabel}
            </label>
            <Input
              id="reminder-run-at"
              type="datetime-local"
              value={runAt}
              onChange={(event) => setRunAt(event.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="reminder-time">
              {copy.timeLabel}
            </label>
            <Input
              id="reminder-time"
              type="time"
              value={timeOfDay}
              onChange={(event) => setTimeOfDay(event.target.value)}
            />
          </div>
        )}
        <div className="flex items-end justify-end">
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              isPending ||
              !name.trim() ||
              !prompt.trim() ||
              (cadence === "once" && !runAt.trim())
            }
          >
            {copy.createReminder}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function normalizeDateTimeLocal(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("run_at is required for once reminder");
  }
  const asDate = new Date(normalized);
  if (Number.isNaN(asDate.getTime())) {
    throw new Error("run_at must be a valid local date and time");
  }
  return asDate.toISOString().replace(/\.\d{3}Z$/, "Z");
}
