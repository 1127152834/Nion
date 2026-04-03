"use client";

import { MessageSquarePlus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const createOrResumeSessionRef = useRef(createOrResumeSession);
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

  createOrResumeSessionRef.current = createOrResumeSession;

  useEffect(() => {
    let cancelled = false;
    setSessionError(null);
    setThreadId(null);

    if (!noteId || !sessionId) {
      return;
    }

    void createOrResumeSessionRef.current
      .mutateAsync({
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
          setSessionError(
            error instanceof Error
              ? error.message
              : "当前笔记内容不可用，暂时无法连接笔记助手。",
          );
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
    <div className="notebook-assistant-shell flex min-h-0 flex-1 flex-col gap-3">
      <section className="notebook-assistant-stream relative min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-[color-mix(in_srgb,var(--notebook-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--notebook-panel)_90%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_14px_30px_-28px_rgba(15,23,42,0.45)]">
        <div className="notebook-assistant-header pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0 rounded-full bg-[color-mix(in_srgb,var(--notebook-panel)_88%,transparent)] px-3 py-2 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.55)] backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[0.82rem] font-semibold tracking-[-0.01em] text-[var(--notebook-ink)]">
              <Sparkles className="size-[0.95rem] shrink-0" />
              <span>笔记助手</span>
            </div>
            <p className="mt-0.5 truncate text-[0.72rem] text-[color-mix(in_srgb,var(--notebook-soft-text)_88%,var(--notebook-ink)_12%)]">
              {noteTitle || "未命名笔记"}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onStartNewConversation}
            className="notebook-assistant-new-chat pointer-events-auto h-9 w-9 shrink-0 rounded-full border-[color-mix(in_srgb,var(--notebook-border)_75%,transparent)] bg-[color-mix(in_srgb,var(--notebook-panel)_92%,transparent)] text-[var(--notebook-soft-text)] shadow-[0_10px_26px_-24px_rgba(15,23,42,0.65)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
            title="新对话"
            aria-label="新对话"
          >
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
        {sessionError ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-[0.82rem] text-[var(--notebook-soft-text)]">
            {sessionError}
          </div>
        ) : !thread.threadId ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-[0.82rem] text-[var(--notebook-soft-text)]">
            正在连接当前笔记上下文…
          </div>
        ) : (
          <ThreadContext.Provider value={{ thread }}>
            <MessageList
              className="h-full px-2"
              contentClassName="notebook-assistant-message-list max-w-none gap-5 px-4 pt-20 pb-4 [&_[data-slot='message']]:text-[0.92rem] [&_.group\\/conversation-message_p]:leading-6 [&_.group\\/conversation-message_pre]:text-[0.8rem] [&_.group\\/conversation-message_ul]:my-2 [&_.group\\/conversation-message_ol]:my-2"
              density="compact"
              threadId={thread.threadId}
              thread={thread}
              pendingClarification={pendingClarification}
              pendingPermissionRequest={pendingPermissionRequest}
              paddingBottom={128}
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
