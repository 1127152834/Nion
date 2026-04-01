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
  AutomationJobCreateInput,
  AutomationJobKind,
} from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

import { AutomationPreviewCard } from "./automation-preview-card";
import { ScheduleBuilder } from "./schedule-builder";

type AutomationCreatorProps = {
  isPending: boolean;
  defaultKind?: Extract<AutomationJobKind, "reminder" | "scheduled_task">;
  onSubmit: (input: AutomationJobCreateInput) => Promise<unknown>;
};

export function AutomationCreator({
  isPending,
  defaultKind = "reminder",
  onSubmit,
}: AutomationCreatorProps) {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.forms;
  const [kind, setKind] =
    useState<Extract<AutomationJobKind, "reminder" | "scheduled_task">>(
      defaultKind,
    );
  const [content, setContent] = useState("");

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
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return;
    }

    await onSubmit(
      buildAutomationDraftRequest({
        kind,
        name: deriveAutomationName(normalizedContent, kind),
        prompt: normalizedContent,
        schedule: {
          ...schedule,
          timezone,
        },
      }),
    );

    setContent("");
  }

  const isTask = kind === "scheduled_task";

  return (
    <Card className="gap-4 py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle>{copy.creatorTitle}</CardTitle>
        <CardDescription>{copy.creatorDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" id="automation-kind-label">
              {copy.creatorKindLabel}
            </label>
            <Select
              value={kind}
              onValueChange={(value) => {
                const nextKind =
                  value as Extract<AutomationJobKind, "reminder" | "scheduled_task">;
                setKind(nextKind);
                setSchedule((current) => {
                  if (current.preset === "interval" || current.preset === "cron") {
                    return { ...current, timezone };
                  }
                  if (current.preset === "once") {
                    return {
                      preset: "once",
                      timezone,
                      runAt: current.runAt,
                    };
                  }
                  if (current.preset === "weekly") {
                    return {
                      preset: "weekly",
                      timezone,
                      timeOfDay: current.timeOfDay,
                      weekdays: current.weekdays,
                    };
                  }
                  return {
                    preset: nextKind === "reminder" ? "daily" : "weekdays",
                    timezone,
                    timeOfDay: current.timeOfDay,
                  };
                });
              }}
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
            <label className="text-sm font-medium" htmlFor="automation-prompt">
              {isTask ? copy.taskContentLabel : copy.contentLabel}
            </label>
            <Textarea
              id="automation-prompt"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={
                isTask
                  ? copy.taskContentPlaceholder
                  : copy.contentPlaceholder
              }
              className="min-h-24"
            />
          </div>
          <div>
            <ScheduleBuilder
              value={{ ...schedule, timezone }}
              onChange={(next) => setSchedule(next)}
            />
          </div>
        </div>

        <AutomationPreviewCard
          kind={kind}
          schedule={{ ...schedule, timezone }}
        />

        <div className="flex justify-end">
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              isPending ||
              !content.trim() ||
              (schedule.preset === "once" && !schedule.runAt.trim())
            }
          >
            {isTask ? copy.createTask : copy.createReminder}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function deriveAutomationName(
  content: string,
  kind: Extract<AutomationJobKind, "reminder" | "scheduled_task">,
) {
  const normalized = content.replace(/\s+/g, " ").trim();
  const summary = normalized.slice(0, 24).trimEnd();
  if (summary) {
    return normalized.length > 24 ? `${summary}…` : summary;
  }
  return kind === "scheduled_task" ? "Scheduled task" : "Reminder";
}
