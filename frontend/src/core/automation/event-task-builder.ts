import type { AutomationActionKind, AutomationJobCreateInput } from "./types";

export function buildEventTaskRequest(input: {
  name: string;
  prompt: string;
  eventName: string;
  actionKind?: AutomationActionKind;
}): AutomationJobCreateInput {
  const actionKind = input.actionKind ?? "agent_prompt";
  return {
    name: input.name.trim(),
    prompt: input.prompt.trim(),
    job_kind: "event_task",
    schedule_kind: "event",
    schedule_preset: "event",
    schedule_value: input.eventName,
    trigger_kind: "event",
    trigger_spec: {
      event_name: input.eventName,
    },
    action_kind: actionKind,
    action_spec: {},
    delivery_mode: "local",
    delivery_targets: [],
    skills: [],
  };
}
