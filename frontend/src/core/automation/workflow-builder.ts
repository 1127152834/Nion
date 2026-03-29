import type { AutomationJobCreateInput, WorkflowStepKind } from "./types";

export function buildWorkflowRequest(input: {
  name: string;
  prompt: string;
  eventName: string;
  steps: Array<{
    id: string;
    kind: WorkflowStepKind;
    config: Record<string, unknown>;
    retry_limit?: number;
  }>;
}): AutomationJobCreateInput {
  return {
    name: input.name.trim(),
    prompt: input.prompt.trim(),
    job_kind: "workflow",
    schedule_kind: "event",
    schedule_preset: "event",
    schedule_value: input.eventName,
    trigger_kind: "event",
    trigger_spec: {
      event_name: input.eventName,
    },
    workflow_steps: input.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      config: step.config,
      retry_limit: step.retry_limit ?? 0,
    })),
    delivery_mode: "local",
    delivery_targets: [],
    skills: [],
  };
}
