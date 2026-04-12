import type { AgentThread } from "./types";
import { bridgeInfoOfThread } from "./utils";

export type WorkspaceThreadType = "general" | "bridge";

export const DEFAULT_WORKSPACE_THREAD_TYPE: WorkspaceThreadType = "general";

export function parseWorkspaceThreadType(
  value: string | null | undefined,
): WorkspaceThreadType {
  return value === "bridge" || value === "general"
    ? value
    : DEFAULT_WORKSPACE_THREAD_TYPE;
}

export function resolveWorkspaceThreadType(input: {
  pathname?: string | null;
  value?: string | null;
}): WorkspaceThreadType {
  return parseWorkspaceThreadType(input.value);
}

export type WorkspaceThreadEntry = {
  thread: AgentThread;
  pendingClarification: boolean;
};

export function groupThreadsByWorkspaceType(entries: WorkspaceThreadEntry[]) {
  const pending = entries.filter((entry) => entry.pendingClarification);
  const regular = entries.filter((entry) => !entry.pendingClarification);
  const ordered = [...pending, ...regular];

  return {
    bridge: ordered.filter(
      (entry) => bridgeInfoOfThread(entry.thread),
    ),
    general: ordered.filter(
      (entry) => !bridgeInfoOfThread(entry.thread),
    ),
  };
}

export function filterThreadsByWorkspaceType(
  groups: ReturnType<typeof groupThreadsByWorkspaceType>,
  type: WorkspaceThreadType,
) {
  return groups[type];
}
