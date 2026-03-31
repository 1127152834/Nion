"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquarePlus, Sparkles } from "lucide-react";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/workspace/messages";
import { ThreadContext } from "@/components/workspace/messages/context";
import { useCreateOrResumeNotebookAssistantSession } from "@/core/notebook-assistant/hooks";
import {
  derivePendingClarification,
  derivePendingPermissionRequest,
} from "@/core/threads";
import { useThreadStream } from "@/core/threads/hooks";

import { NotebookAssistantComposer } from "./notebook-assistant-composer";

type NotebookAssistantPanelProps = {
  noteId: string | null;
  noteTitle: string;
  sessionId: string | null;
  onStartNewConversation: () => void;
};

export function NotebookAssistantPanel({
  noteId,
  noteTitle,
  sessionId,
  onStartNewConversation,
}: NotebookAssistantPanelProps) {
  const createOrResumeSession = useCreateOrResumeNotebookAssistantSession();
  const { mutateAsync: createOrResumeSessionAsync } = createOrResumeSession;
  const [threadId, setThreadId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [thread, sendMessage] = useThreadStream({
    threadId,
    context: {
      model_name: undefined,
      mode: "thinking",
      agent_name: "notebook-chat",
      reasoning_effort: "low",
      execution_mode: "sandbox",
      host_workdir: undefined,
    },
  });

  useEffect(() => {
    let cancelled = false;
    setSessionError(null);
    setThreadId(null);

    if (!noteId || !sessionId) {
      return;
    }

    void createOrResumeSessionAsync({
        noteId,
        sessionId,
      })
      .then((session) => {
        if (!cancelled) {
          setThreadId(session.thread_id);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSessionError(error instanceof Error ? error.message : "连接笔记助手失败");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [noteId, sessionId]);

  const pendingClarification = useMemo(
    () => derivePendingClarification(thread.messages),
    [thread.messages],
  );
  const pendingPermissionRequest = useMemo(
    () => derivePendingPermissionRequest(thread.messages),
    [thread.messages],
  );

  async function handleSubmit(text: string) {
    if (!thread.threadId) {
      return;
    }
    const message: PromptInputMessage = {
      text,
      files: [],
    };
    await sendMessage(thread.threadId, message, {
      notebook_note_id: noteId,
      notebook_note_title: noteTitle,
      notebook_session_id: sessionId,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <section className="rounded-[1.25rem] border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--notebook-ink)]">
              <Sparkles className="size-4" />
              笔记助手
            </div>
            <p className="mt-1 text-sm text-[var(--notebook-soft-text)]">
              {noteTitle || "围绕当前笔记继续提问、分析和改写。"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onStartNewConversation}
            className="shrink-0 rounded-full"
          >
            <MessageSquarePlus className="size-4" />
            新对话
          </Button>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden rounded-[1.25rem] border border-[var(--notebook-border)] bg-[var(--notebook-panel)]">
        {sessionError ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--notebook-soft-text)]">
            {sessionError}
          </div>
        ) : !thread.threadId ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--notebook-soft-text)]">
            正在连接笔记助手会话…
          </div>
        ) : (
          <ThreadContext.Provider value={{ thread }}>
            <MessageList
              className="h-full px-4 pb-4"
              threadId={thread.threadId}
              thread={thread}
              pendingClarification={pendingClarification}
              pendingPermissionRequest={pendingPermissionRequest}
              paddingBottom={96}
            />
          </ThreadContext.Provider>
        )}
      </section>

      <NotebookAssistantComposer
        disabled={!thread.threadId || !noteId}
        isSending={thread.isLoading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
