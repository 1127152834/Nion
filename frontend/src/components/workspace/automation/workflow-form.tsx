"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AutomationJobCreateInput, WorkflowStepKind } from "@/core/automation/types";
import { buildWorkflowRequest } from "@/core/automation/workflow-builder";
import { useI18n } from "@/core/i18n/hooks";

type WorkflowFormProps = {
  isPending: boolean;
  onSubmit: (input: AutomationJobCreateInput) => Promise<void>;
};

type DraftStep = {
  id: string;
  kind: WorkflowStepKind;
  configText: string;
};

export function WorkflowForm({ isPending, onSubmit }: WorkflowFormProps) {
  const { t } = useI18n();
  const settingsCopy = t.settings.automation;
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [eventName, setEventName] = useState("agent.run.completed");
  const [steps, setSteps] = useState<DraftStep[]>([
    { id: "step-notify", kind: "notify", configText: '{"title":"Reply finished"}' },
    { id: "step-wait", kind: "wait_for_user", configText: '{"prompt":"Continue?"}' },
  ]);

  async function handleSubmit() {
    if (!name.trim() || !prompt.trim() || steps.length === 0) {
      return;
    }

    const workflow_steps = steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      config: parseConfig(step.configText),
    }));

    await onSubmit(
      buildWorkflowRequest({
        name,
        prompt,
        eventName,
        steps: workflow_steps,
      }),
    );

    setName("");
    setPrompt("");
    setSteps([
      { id: "step-notify", kind: "notify", configText: '{"title":"Reply finished"}' },
      { id: "step-wait", kind: "wait_for_user", configText: '{"prompt":"Continue?"}' },
    ]);
  }

  function addStep() {
    setSteps((current) => [
      ...current,
      {
        id: `step-${current.length + 1}`,
        kind: "delay",
        configText: '{"seconds":1}',
      },
    ]);
  }

  return (
    <Card className="gap-4 py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle>Workflow</CardTitle>
        <CardDescription>Create linear multi-step workflows.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="workflow-name">
              {settingsCopy.nameLabel}
            </label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={settingsCopy.namePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="workflow-event">
              Trigger event
            </label>
            <Input
              id="workflow-event"
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="workflow-prompt">
              Prompt
            </label>
            <Textarea
              id="workflow-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe what this workflow should accomplish."
              className="min-h-24"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Workflow steps</div>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              Add step
            </Button>
          </div>
          {steps.map((step, index) => (
            <div key={step.id} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[180px_180px_1fr]">
              <Input
                value={step.id}
                onChange={(event) =>
                  setSteps((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, id: event.target.value } : item,
                    ),
                  )
                }
              />
              <Select
                value={step.kind}
                onValueChange={(value) =>
                  setSteps((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, kind: value as WorkflowStepKind } : item,
                    ),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notify">notify</SelectItem>
                  <SelectItem value="agent_prompt">agent_prompt</SelectItem>
                  <SelectItem value="play_sound">play_sound</SelectItem>
                  <SelectItem value="delay">delay</SelectItem>
                  <SelectItem value="wait_for_user">wait_for_user</SelectItem>
                  <SelectItem value="script">script</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={step.configText}
                onChange={(event) =>
                  setSteps((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, configText: event.target.value } : item,
                    ),
                  )
                }
                className="min-h-20 font-mono text-xs"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => void handleSubmit()}
            disabled={isPending || !name.trim() || !prompt.trim() || steps.length === 0}
          >
            Create workflow
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function parseConfig(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
