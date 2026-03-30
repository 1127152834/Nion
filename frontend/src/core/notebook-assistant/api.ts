import { createThreadClient } from "../api/thread-client.ts";

import type {
  NotebookAssistantSessionInput,
  NotebookAssistantSessionRecord,
} from "./types.ts";

export async function createOrResumeNotebookAssistantSession(
  input: NotebookAssistantSessionInput,
): Promise<NotebookAssistantSessionRecord> {
  const client = createThreadClient();
  return client.createOrResumeNotebookAssistantSession({
    note_id: input.noteId,
    session_id: input.sessionId,
  }) as Promise<NotebookAssistantSessionRecord>;
}
