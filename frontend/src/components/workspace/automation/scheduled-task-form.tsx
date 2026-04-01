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
import type {
  AutomationDeliveryMode,
  AutomationJobCreateInput,
} from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type ScheduledTaskFormProps = {
  isPending: boolean;
  onSubmit: (input: AutomationJobCreateInput) => Promise<void>;
};

export function ScheduledTaskForm({
  isPending,
  onSubmit,
}: ScheduledTaskFormProps) {
  const { locale, t } = useI18n();
  const settingsCopy = t.settings.automation;
  const copy = t.settings.automationWorkspace.forms;
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cadence, setCadence] = useState<"daily" | "weekdays" | "weekly">("weekdays");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
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
      cadence === "weekly"
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
        kind: "scheduled_task",
        name,
        prompt,
        schedule,
        deliveryMode,
        skills: skillsText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    );

    setName("");
    setPrompt("");
    setSkillsText("");
  }

  return (
    <Card className="gap-4 py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle>{copy.taskTitle}</CardTitle>
        <CardDescription>{copy.taskDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="task-name">
              {settingsCopy.nameLabel}
            </label>
            <Input
              id="task-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={settingsCopy.namePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" id="task-cadence-label">
              {copy.cadenceLabel}
            </label>
            <Select
              value={cadence}
              onValueChange={(value) =>
                setCadence(value as "daily" | "weekdays" | "weekly")
              }
            >
              <SelectTrigger aria-labelledby="task-cadence-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{copy.cadenceOptions.daily}</SelectItem>
                <SelectItem value="weekdays">
                  {copy.cadenceOptions.weekdays}
                </SelectItem>
                <SelectItem value="weekly">{copy.cadenceOptions.weekly}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="task-prompt">
              {settingsCopy.promptLabel}
            </label>
            <Textarea
              id="task-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={settingsCopy.promptPlaceholder}
              className="min-h-24"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="task-time">
              {copy.timeLabel}
            </label>
            <Input
              id="task-time"
              type="time"
              value={timeOfDay}
              onChange={(event) => setTimeOfDay(event.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          className="text-sm font-medium underline-offset-4 hover:underline"
          onClick={() => setShowAdvanced((value) => !value)}
        >
          {locale === "zh-CN" ? "更多设置" : "More settings"}
        </button>

        {showAdvanced ? (
          <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                id="task-delivery-mode-label"
              >
                {settingsCopy.deliveryModeLabel}
              </label>
              <Select
                value={deliveryMode}
                onValueChange={(value) =>
                  setDeliveryMode(value as AutomationDeliveryMode)
                }
              >
                <SelectTrigger aria-labelledby="task-delivery-mode-label">
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
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="task-skills">
                {settingsCopy.attachedSkillsLabel}
              </label>
              <Input
                id="task-skills"
                value={skillsText}
                onChange={(event) => setSkillsText(event.target.value)}
                placeholder={settingsCopy.attachedSkillsPlaceholder}
              />
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            onClick={() => void handleSubmit()}
            disabled={isPending || !name.trim() || !prompt.trim()}
          >
            {copy.createTask}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
