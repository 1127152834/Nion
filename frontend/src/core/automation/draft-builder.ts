import {
  buildScheduleRequestFields,
  type AutomationScheduleDefinition,
} from "./schedule-definition.ts";
import type {
  AutomationDeliveryMode,
  AutomationJobCreateInput,
  AutomationJobKind,
  AutomationImplicitMention,
} from "./types";

export type AutomationDraftInput = {
  kind: AutomationJobKind;
  name: string;
  prompt: string;
  schedule: AutomationScheduleDefinition;
  deliveryMode?: AutomationDeliveryMode;
  deliveryTargets?: Array<Record<string, unknown>>;
  skills?: string[];
  implicitMentions?: AutomationImplicitMention[];
};

export function buildAutomationDraftRequest(
  input: AutomationDraftInput,
): AutomationJobCreateInput {
  const scheduleFields = buildScheduleRequestFields(input.schedule);

  return {
    name: input.name.trim(),
    prompt: input.prompt.trim(),
    job_kind: input.kind,
    ...scheduleFields,
    delivery_mode: input.deliveryMode ?? "local",
    delivery_targets: input.deliveryTargets ?? [],
    skills: input.skills ?? [],
    implicit_mentions: input.implicitMentions ?? [],
    session_policy:
      input.implicitMentions && input.implicitMentions.length > 0
        ? {
            implicit_mentions: input.implicitMentions,
          }
        : undefined,
  };
}
