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
  type AutomationDraftCadence,
} from "@/core/automation/draft-builder";
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
  const [cadence, setCadence] = useState<AutomationDraftCadence>("daily");
  const [timeOfDay, setTimeOfDay] = useState("09:00");

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  async function handleSubmit() {
    if (!name.trim() || !prompt.trim()) {
      return;
    }

    await onSubmit(
      buildAutomationDraftRequest({
        kind: "reminder",
        name,
        prompt,
        cadence,
        timeOfDay,
        timezone,
      }),
    );

    setName("");
    setPrompt("");
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
            onValueChange={(value) => setCadence(value as AutomationDraftCadence)}
          >
            <SelectTrigger aria-labelledby="reminder-cadence-label">
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
        <div className="flex items-end justify-end">
          <Button
            onClick={() => void handleSubmit()}
            disabled={isPending || !name.trim() || !prompt.trim()}
          >
            {copy.createReminder}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
