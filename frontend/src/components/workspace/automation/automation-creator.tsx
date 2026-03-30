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

import { AutomationPreviewCard } from "./automation-preview-card";
import { ScheduleBuilder } from "./schedule-builder";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deliveryMode, setDeliveryMode] =
    useState<AutomationDeliveryMode>("local");
  const [skillsText, setSkillsText] = useState("");

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  const [schedule, setSchedule] = useState<AutomationScheduleDefinition>({
    preset: kind === "reminder" ? "daily" : "weekdays",
    timezone,
    timeOfDay: "09:00",
  });

  async function handleSubmit() {
    if (!name.trim() || !prompt.trim()) {
      return;
    }

    await onSubmit(
      buildAutomationDraftRequest({
        kind,
        name,
        prompt,
        schedule: {
          ...schedule,
          timezone,
        },
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
    setSkillsText("");
  }

  const isTask = kind === "scheduled_task";

  return (
    <Card className="gap-4 overflow-hidden rounded-[30px] border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,252,245,0.98),rgba(246,240,230,0.92))] py-0 shadow-[0_24px_80px_rgba(96,72,35,0.12)]">
      <CardHeader className="relative overflow-hidden px-6 pt-6 pb-4">
        <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(126,87,56,0.35),transparent)]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-2xl tracking-tight text-stone-900">
              {copy.creatorTitle}
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-stone-500">
              {copy.creatorDescription}
            </CardDescription>
          </div>
          <div className="rounded-[22px] border border-stone-200/80 bg-white/80 px-4 py-3 text-right shadow-xs">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-stone-400">
              {copy.previewLabel}
            </div>
            <div className="mt-1 text-sm font-medium text-stone-800">
              {isTask ? copy.creatorKinds.task : copy.creatorKinds.reminder}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5 rounded-[24px] border border-stone-200/80 bg-white/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700" id="automation-kind-label">
                  {copy.creatorKindLabel}
                </label>
                <Select
                  value={kind}
                  onValueChange={(value) => {
                    const nextKind =
                      value as Extract<AutomationJobKind, "reminder" | "scheduled_task">;
                    setKind(nextKind);
                    setSchedule((current) => ({
                      ...current,
                      preset:
                        current.preset === "interval" || current.preset === "cron"
                          ? current.preset
                          : nextKind === "reminder"
                            ? "daily"
                            : "weekdays",
                      timezone,
                    }));
                  }}
                >
                  <SelectTrigger aria-labelledby="automation-kind-label" className="h-11 rounded-2xl border-stone-200 bg-stone-50/70">
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
                <label className="text-sm font-medium text-stone-700" htmlFor="automation-name">
                  {settingsCopy.nameLabel}
                </label>
                <Input
                  id="automation-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={settingsCopy.namePlaceholder}
                  className="h-11 rounded-2xl border-stone-200 bg-stone-50/70"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700" htmlFor="automation-prompt">
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
                className="min-h-28 rounded-[22px] border-stone-200 bg-stone-50/70"
              />
            </div>

            <div className="rounded-[24px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(248,244,236,0.85),rgba(255,255,255,0.75))] p-4">
              <ScheduleBuilder
                value={{ ...schedule, timezone }}
                onChange={(next) => setSchedule(next)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <AutomationPreviewCard
              kind={kind}
              schedule={{ ...schedule, timezone }}
              deliveryMode={deliveryMode}
            />

            <div className="rounded-[24px] border border-stone-200/80 bg-white/74 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left text-sm font-medium text-stone-700"
                onClick={() => setShowAdvanced((value) => !value)}
              >
                <span>{copy.advancedOptions}</span>
                <span className="text-stone-400">{showAdvanced ? "−" : "+"}</span>
              </button>

              {showAdvanced ? (
                <div className="mt-4 grid gap-4 rounded-[20px] border border-stone-200/80 bg-stone-50/70 p-4">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-stone-700"
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
                      <SelectTrigger aria-labelledby="automation-delivery-mode-label" className="h-11 rounded-2xl border-stone-200 bg-white/80">
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
                      <label className="text-sm font-medium text-stone-700" htmlFor="automation-skills">
                        {settingsCopy.attachedSkillsLabel}
                      </label>
                      <Input
                        id="automation-skills"
                        value={skillsText}
                        onChange={(event) => setSkillsText(event.target.value)}
                        placeholder={settingsCopy.attachedSkillsPlaceholder}
                        className="h-11 rounded-2xl border-stone-200 bg-white/80"
                      />
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-stone-200 bg-white/70 px-4 py-3 text-sm leading-6 text-stone-500">
                      {copy.previewReminderAdvancedHint}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => void handleSubmit()}
                disabled={
                  isPending ||
                  !name.trim() ||
                  !prompt.trim() ||
                  (schedule.preset === "once" && !schedule.runAt.trim())
                }
                className="h-12 rounded-2xl bg-stone-900 px-6 text-white shadow-[0_18px_34px_rgba(45,35,22,0.18)] hover:bg-stone-800"
              >
                {isTask ? copy.createTask : copy.createReminder}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
