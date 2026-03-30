import { createThreadClient } from "../api/thread-client.ts";

import type {
  NotebookAssistantRewriteInput,
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

export function buildNotebookRewriteRequest(
  input: NotebookAssistantRewriteInput,
) {
  return {
    content: input.content,
    expected_content_hash: input.expectedContentHash,
    selection_start: input.selectionStart,
    selection_end: input.selectionEnd,
  };
}
