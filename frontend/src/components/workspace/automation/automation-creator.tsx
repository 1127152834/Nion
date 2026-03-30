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
import { buildAutomationDraftRequest } from "@/core/automation/draft-builder";
import type { AutomationScheduleDefinition } from "@/core/automation/schedule-definition";
import type {
  AutomationDeliveryMode,
  AutomationJobCreateInput,
  AutomationJobKind,
} from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type AutomationCreatorProps = {
  isPending: boolean;
  defaultKind?: Extract<AutomationJobKind, "reminder" | "scheduled_task">;
  onSubmit: (input: AutomationJobCreateInput) => Promise<void>;
};

export function AutomationCreator({
  isPending,
  defaultKind = "reminder",
  onSubmit,
}: AutomationCreatorProps) {
  const { t } = useI18n();
  const settingsCopy = t.settings.automation;
  const copy = t.settings.automationWorkspace.forms;
  const [kind, setKind] =
    useState<Extract<AutomationJobKind, "reminder" | "scheduled_task">>(
      defaultKind,
    );
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cadence, setCadence] = useState<
    "once" | "daily" | "weekdays" | "weekly"
  >(kind === "reminder" ? "daily" : "weekdays");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [runAt, setRunAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deliveryMode, setDeliveryMode] =
    useState<AutomationDeliveryMode>("local");
  const [skillsText, setSkillsText] = useState("");

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
        kind,
        name,
        prompt,
        schedule,
        deliveryMode,
        skills:
          kind === "scheduled_task"
            ? skillsText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
      }),
    );

    setName("");
    setPrompt("");
    setRunAt("");
    setSkillsText("");
  }

  const isOnce = cadence === "once";
  const isTask = kind === "scheduled_task";

  return (
    <Card className="gap-4 py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle>{copy.creatorTitle}</CardTitle>
        <CardDescription>{copy.creatorDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" id="automation-kind-label">
              {copy.creatorKindLabel}
            </label>
            <Select
              value={kind}
              onValueChange={(value) =>
                setKind(value as Extract<AutomationJobKind, "reminder" | "scheduled_task">)
              }
            >
              <SelectTrigger aria-labelledby="automation-kind-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reminder">{copy.creatorKinds.reminder}</SelectItem>
                <SelectItem value="scheduled_task">
                  {copy.creatorKinds.task}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="automation-name">
              {settingsCopy.nameLabel}
            </label>
            <Input
              id="automation-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={settingsCopy.namePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" id="automation-cadence-label">
              {copy.cadenceLabel}
            </label>
            <Select
              value={cadence}
              onValueChange={(value) =>
                setCadence(value as "once" | "daily" | "weekdays" | "weekly")
              }
            >
              <SelectTrigger aria-labelledby="automation-cadence-label">
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
          {isOnce ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="automation-run-at">
                {copy.dateTimeLabel}
              </label>
              <Input
                id="automation-run-at"
                type="datetime-local"
                value={runAt}
                onChange={(event) => setRunAt(event.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="automation-time">
                {copy.timeLabel}
              </label>
              <Input
                id="automation-time"
                type="time"
                value={timeOfDay}
                onChange={(event) => setTimeOfDay(event.target.value)}
              />
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="automation-prompt">
              {isTask ? copy.taskPromptLabel : settingsCopy.promptLabel}
            </label>
            <Textarea
              id="automation-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={
                isTask
                  ? copy.taskPromptPlaceholder
                  : settingsCopy.promptPlaceholder
              }
              className="min-h-24"
            />
          </div>
        </div>

        <button
          type="button"
          className="text-sm font-medium underline-offset-4 hover:underline"
          onClick={() => setShowAdvanced((value) => !value)}
        >
          {copy.advancedOptions}
        </button>

        {showAdvanced ? (
          <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                id="automation-delivery-mode-label"
              >
                {settingsCopy.deliveryModeLabel}
              </label>
              <Select
                value={deliveryMode}
                onValueChange={(value) =>
                  setDeliveryMode(value as AutomationDeliveryMode)
                }
              >
                <SelectTrigger aria-labelledby="automation-delivery-mode-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">
                    {settingsCopy.deliveryModes.local}
                  </SelectItem>
                  <SelectItem value="thread">
                    {settingsCopy.deliveryModes.thread}
                  </SelectItem>
                  <SelectItem value="channel">
                    {settingsCopy.deliveryModes.channel}
                  </SelectItem>
                  <SelectItem value="multi">
                    {settingsCopy.deliveryModes.multi}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isTask ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="automation-skills">
                  {settingsCopy.attachedSkillsLabel}
                </label>
                <Input
                  id="automation-skills"
                  value={skillsText}
                  onChange={(event) => setSkillsText(event.target.value)}
                  placeholder={settingsCopy.attachedSkillsPlaceholder}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium">{copy.previewLabel}</div>
                <div className="text-muted-foreground text-sm">
                  {describeSummary({
                    kind,
                    cadence,
                    timeOfDay,
                    runAt,
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              isPending ||
              !name.trim() ||
              !prompt.trim() ||
              (isOnce && !runAt.trim())
            }
          >
            {isTask ? copy.createTask : copy.createReminder}
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

function describeSummary(input: {
  kind: "reminder" | "scheduled_task";
  cadence: "once" | "daily" | "weekdays" | "weekly";
  timeOfDay: string;
  runAt: string;
}) {
  if (input.cadence === "once") {
    return input.runAt
      ? `Will run once at ${input.runAt}`
      : "Choose a date and time for a one-time automation.";
  }
  if (input.cadence === "daily") {
    return `Runs every day at ${input.timeOfDay}.`;
  }
  if (input.cadence === "weekdays") {
    return `Runs every weekday at ${input.timeOfDay}.`;
  }
  return `${
    input.kind === "reminder" ? "Reminder" : "Task"
  } runs every week at ${input.timeOfDay}.`;
}
