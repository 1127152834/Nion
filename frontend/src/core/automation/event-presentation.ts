import { pathOfAutomation, pathOfThread } from "../navigation/desktop-routes.ts";
import { formatTimeAgo } from "../utils/datetime.ts";

import type { AutomationActionKind } from "./types";
import type { AutomationEvent } from "./types";

export function summarizeAutomationEvent(event: AutomationEvent, locale = "en-US") {
  const title =
    typeof event.message === "string" && event.message.trim()
      ? event.message.trim()
      : event.event_type;
  const timeLabel = event.timestamp ? formatTimeAgo(event.timestamp, locale) : "";
  const metaParts = [event.category, event.level, timeLabel].filter(Boolean);

  return {
    title,
    meta: metaParts.join(" · "),
  };
}

export function buildEventTaskDraftFromEvent(event: { event_type: string }) {
  if (event.event_type === "clarification.requested") {
    return {
      name: "Need my attention",
      eventName: event.event_type,
      actionKind: "notify" as AutomationActionKind,
      prompt: "Notify me when Nion needs clarification or my input.",
    };
  }
  if (event.event_type === "automation.run.failed") {
    return {
      name: "Automation failed alert",
      eventName: event.event_type,
      actionKind: "notify" as AutomationActionKind,
      prompt: "Notify me when an automation run fails and needs attention.",
    };
  }
  if (event.event_type === "agent.run.completed") {
    return {
      name: "Reply finished reminder",
      eventName: event.event_type,
      actionKind: "notify" as AutomationActionKind,
      prompt: "Notify me when the assistant finishes a reply.",
    };
  }
  return {
    name: `${event.event_type} task`,
    eventName: event.event_type,
    actionKind: "notify" as AutomationActionKind,
    prompt: `React when ${event.event_type} happens.`,
  };
}

export function resolveAutomationEventThreadHref(event: {
  thread_id?: string | null;
}) {
  if (!event.thread_id) {
    return null;
  }
  return pathOfThread(event.thread_id);
}

export function resolveAutomationEventRunHref(event: {
  run_id?: string | null;
}) {
  if (!event.run_id) {
    return null;
  }
  return pathOfAutomation({
    tab: "history",
    run: event.run_id,
  });
}
