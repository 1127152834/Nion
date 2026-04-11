import type { ChildRunRecord } from "./types";

type ChildRunEvent =
  | { type: "child_run_created"; child_run_id: string; agent_name: string }
  | { type: "child_run_running"; child_run_id: string; message: string }
  | { type: "child_run_completed"; child_run_id: string; result: string }
  | { type: "child_run_closed"; child_run_id: string };

export function reduceChildRunEvent(
  current: Record<string, ChildRunRecord>,
  event: ChildRunEvent,
): Record<string, ChildRunRecord> {
  if (event.type === "child_run_created") {
    return {
      ...current,
      [event.child_run_id]: {
        child_run_id: event.child_run_id,
        agent_name: event.agent_name,
        title: event.agent_name,
        status: "created",
        description: "",
      },
    };
  }

  const existing = current[event.child_run_id];
  if (!existing) return current;

  if (event.type === "child_run_running") {
    return {
      ...current,
      [event.child_run_id]: {
        ...existing,
        status: "running",
        latest_message: event.message,
      },
    };
  }

  if (event.type === "child_run_completed") {
    return {
      ...current,
      [event.child_run_id]: {
        ...existing,
        status: "completed",
        result: event.result,
      },
    };
  }

  return {
    ...current,
    [event.child_run_id]: {
      ...existing,
      status: "closed",
    },
  };
}
