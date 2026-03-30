import type { AgentThreadState, Thread } from "../threads/types";

export type NotebookAssistantThreadScope = "notebook_assistant";

export interface NotebookAssistantThreadState extends AgentThreadState {
  scope: NotebookAssistantThreadScope;
  note_id: string;
  notebook_session_id: string;
}

export interface NotebookAssistantSessionRecord
  extends Thread<NotebookAssistantThreadState> {
  agent_name?: string;
  deleted?: boolean;
  created: boolean;
}

export interface NotebookAssistantSessionInput {
  noteId: string;
  sessionId: string;
}

export interface NotebookAssistantRewriteInput {
  noteId: string;
  content: string;
  expectedContentHash: string;
  selectionStart?: number;
  selectionEnd?: number;
}
