"use client";

import { useEffect, useState } from "react";

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
import { buildEventTaskRequest } from "@/core/automation/event-task-builder";
import type { AutomationActionKind, AutomationJobCreateInput } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type EventTaskFormProps = {
  isPending: boolean;
  onSubmit: (input: AutomationJobCreateInput) => Promise<void>;
  presetDraft?: {
    name: string;
    eventName: string;
    actionKind: AutomationActionKind;
    prompt: string;
  } | null;
  quickTemplates?: Array<{
    label: string;
    eventName: string;
    actionKind: AutomationActionKind;
    prompt: string;
  }>;
};

const DEFAULT_EVENT = "agent.run.completed";
const DEFAULT_ACTION = "notify";

export function EventTaskForm({
  isPending,
  onSubmit,
  presetDraft = null,
  quickTemplates = [],
}: EventTaskFormProps) {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.forms;
  const settingsCopy = t.settings.automation;
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [eventName, setEventName] = useState(DEFAULT_EVENT);
  const [actionKind, setActionKind] = useState<
    "agent_prompt" | "notify" | "play_sound" | "notebook_write"
  >(DEFAULT_ACTION);

  async function handleSubmit() {
    if (!name.trim() || !prompt.trim()) {
      return;
    }

    await onSubmit(
      buildEventTaskRequest({
        name,
        prompt,
        eventName,
        actionKind,
      }),
    );

    setName("");
    setPrompt("");
    setEventName(DEFAULT_EVENT);
    setActionKind(DEFAULT_ACTION);
  }

  function applyTemplate(
    template: NonNullable<EventTaskFormProps["quickTemplates"]>[number],
  ) {
    if (!template) {
      return;
    }
    setName(template.label);
    setEventName(template.eventName);
    setActionKind(
      (template.actionKind === "script"
        ? "agent_prompt"
        : template.actionKind) as
        | "agent_prompt"
        | "notify"
        | "play_sound"
        | "notebook_write",
    );
    setPrompt(template.prompt);
  }

  useEffect(() => {
    if (!presetDraft) {
      return;
    }
    setName(presetDraft.name);
    setEventName(presetDraft.eventName);
    setActionKind(
      (presetDraft.actionKind === "script"
        ? "agent_prompt"
        : presetDraft.actionKind) as
        | "agent_prompt"
        | "notify"
        | "play_sound"
        | "notebook_write",
    );
    setPrompt(presetDraft.prompt);
  }, [presetDraft]);

  return (
    <Card className="gap-4 py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle>{copy.eventTitle}</CardTitle>
        <CardDescription>{copy.eventDescription}</CardDescription>
        {quickTemplates.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {quickTemplates.map((template) => (
              <Button
                key={template.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(template)}
              >
                {template.label}
              </Button>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="event-name">
            {settingsCopy.nameLabel}
          </label>
          <Input
            id="event-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={settingsCopy.namePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" id="event-type-label">
            {copy.eventTypeLabel}
          </label>
          <Select value={eventName} onValueChange={setEventName}>
            <SelectTrigger aria-labelledby="event-type-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agent.run.completed">
                {copy.eventOptions.agentRunCompleted}
              </SelectItem>
              <SelectItem value="agent.run.failed">
                {copy.eventOptions.agentRunFailed}
              </SelectItem>
              <SelectItem value="clarification.requested">
                {copy.eventOptions.clarificationRequested}
              </SelectItem>
              <SelectItem value="permission.requested">
                {copy.eventOptions.permissionRequested}
              </SelectItem>
              <SelectItem value="automation.run.failed">
                {copy.eventOptions.automationRunFailed}
              </SelectItem>
              <SelectItem value="thread.finished">
                {copy.eventOptions.threadFinished}
              </SelectItem>
              <SelectItem value="thread.failed">
                {copy.eventOptions.threadFailed}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" id="event-action-label">
            {copy.eventActionLabel}
          </label>
          <Select
            value={actionKind}
            onValueChange={(value) =>
              setActionKind(value as "agent_prompt" | "notify" | "play_sound" | "notebook_write")
            }
          >
            <SelectTrigger aria-labelledby="event-action-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="notify">{copy.eventActionOptions.notify}</SelectItem>
              <SelectItem value="play_sound">{copy.eventActionOptions.playSound}</SelectItem>
              <SelectItem value="notebook_write">{copy.eventActionOptions.notebookWrite}</SelectItem>
              <SelectItem value="agent_prompt">{copy.eventActionOptions.agentPrompt}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="event-prompt">
            {copy.eventPromptLabel}
          </label>
          <Textarea
            id="event-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={copy.eventPromptPlaceholder}
            className="min-h-24"
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button
            onClick={() => void handleSubmit()}
            disabled={isPending || !name.trim() || !prompt.trim()}
          >
            {copy.createEvent}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
