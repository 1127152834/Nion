import type { AgentThread } from "./types";

export function removeThreadFromSearchCache(
  oldData: Array<AgentThread> | undefined,
  threadId: string,
) {
  if (oldData == null) {
    return oldData;
  }

  return oldData.filter((thread) => thread.thread_id !== threadId);
}
