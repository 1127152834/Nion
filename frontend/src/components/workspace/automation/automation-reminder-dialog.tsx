"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { buildAutomationDraftRequest } from "@/core/automation/draft-builder";
import type { AutomationScheduleDefinition } from "@/core/automation/schedule-definition";
import type { AutomationJobCreateInput } from "@/core/automation/types";

import { ScheduleBuilder } from "./schedule-builder";

type AutomationReminderDialogProps = {
  triggerLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isPending: boolean;
  onCreate: (input: AutomationJobCreateInput) => Promise<unknown>;
};

export function AutomationReminderDialog({
  triggerLabel,
  open,
  onOpenChange,
  isPending,
  onCreate,
}: AutomationReminderDialogProps) {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  const [content, setContent] = useState("");
  const [schedule, setSchedule] = useState<AutomationScheduleDefinition>({
    preset: "daily",
    timezone,
    timeOfDay: "09:00",
  });

  async function handleSubmit() {
    const prompt = content.trim();
    if (!prompt) {
      return;
    }

    await onCreate(
      buildAutomationDraftRequest({
        kind: "reminder",
        name: buildFallbackName(prompt),
        prompt,
        schedule: { ...schedule, timezone },
      }),
    );

    setContent("");
    onOpenChange?.(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>添加提醒事项</DialogTitle>
          <DialogDescription>
            提醒事项保持简单，只填写提醒内容和定时配置。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="automation-reminder-content">
              提醒内容
            </label>
            <Textarea
              id="automation-reminder-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="例如：提醒我每个工作日下午 6 点提交日报"
              className="min-h-28"
            />
          </div>
          <ScheduleBuilder
            value={{ ...schedule, timezone }}
            onChange={(next) => setSchedule(next)}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              isPending ||
              !content.trim() ||
              (schedule.preset === "once" && !schedule.runAt.trim())
            }
          >
            创建提醒
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildFallbackName(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  const summary = normalized.slice(0, 24).trimEnd();
  return normalized.length > 24 ? `${summary}…` : summary;
}
