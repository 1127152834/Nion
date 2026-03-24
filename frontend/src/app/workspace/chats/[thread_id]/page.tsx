"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  ArtifactTrigger,
  WorkingDirectoryTrigger,
} from "@/components/workspace/artifacts";
import {
  ChatBox,
  useSpecificChatMode,
  useThreadChat,
} from "@/components/workspace/chats";
import { ExportTrigger } from "@/components/workspace/export-trigger";
import { InputBox } from "@/components/workspace/input-box";
import { MessageList } from "@/components/workspace/messages";
import { ThreadContext } from "@/components/workspace/messages/context";
import { NewChatStage } from "@/components/workspace/new-chat-stage";
import { RuntimeModeToggle } from "@/components/workspace/runtime-mode-toggle";
import { ThreadTitle } from "@/components/workspace/thread-title";
import { TodoList } from "@/components/workspace/todo-list";
import { Welcome } from "@/components/workspace/welcome";
import { loadThreadFilesTree } from "@/core/files";
import { useI18n } from "@/core/i18n/hooks";
import { useNotification } from "@/core/notification/hooks";
import { type RuntimeProfile, fetchRuntimeProfile, updateRuntimeProfile } from "@/core/runtime";
import { useLocalSettings } from "@/core/settings";
import { useThreadStream } from "@/core/threads/hooks";
import {
  pathOfThread,
  textOfMessage,
} from "@/core/threads/utils";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useLocalSettings();

  const { threadId, isNewThread, setIsNewThread, isMock } = useThreadChat();
  useSpecificChatMode();

  const { showNotification } = useNotification();
  const [runtimeProfile, setRuntimeProfile] = useState<RuntimeProfile>({
    execution_mode: "sandbox",
    host_workdir: null,
    locked: false,
    updated_at: null,
  });
  const [runtimeProfileLoading, setRuntimeProfileLoading] = useState(false);
  const [runtimeProfileSaving, setRuntimeProfileSaving] = useState(false);

  useEffect(() => {
    if (isMock) {
      return;
    }
    let cancelled = false;
    setRuntimeProfileLoading(true);
    void fetchRuntimeProfile(threadId)
      .then((profile) => {
        if (!cancelled) {
          setRuntimeProfile(profile);
        }
      })
      .catch((error) => {
        console.warn("Failed to load runtime profile:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setRuntimeProfileLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isMock, threadId]);

  const threadRuntimeContext = useMemo(
    () => ({
      execution_mode: runtimeProfile.execution_mode,
      host_workdir: runtimeProfile.host_workdir ?? undefined,
    }),
    [runtimeProfile.execution_mode, runtimeProfile.host_workdir],
  );

  const { data: workingDirectoryTree } = useQuery({
    queryKey: ["threadFiles", "tree", threadId, "composer"],
    queryFn: () =>
      loadThreadFilesTree(threadId, {
        root: "/mnt/user-data/workspace",
        depth: 6,
        includeHidden: false,
        maxNodes: 2000,
      }),
    enabled: !isMock,
    staleTime: 5_000,
  });

  const workspacePaths = useMemo(
    () => [
      ...(workingDirectoryTree?.directories.map((item) => `${item.path}/`) ?? []),
      ...(workingDirectoryTree?.files.map((item) => item.path) ?? []),
    ],
    [workingDirectoryTree],
  );

  const [thread, sendMessage, isUploading] = useThreadStream({
    threadId: isNewThread ? undefined : threadId,
    context: {
      ...settings.context,
      ...threadRuntimeContext,
    },
    isMock,
    onStart: (startedThreadId) => {
      setIsNewThread(false);
      // Use the history API here so the thread stream keeps its mounted state.
      history.replaceState(null, "", pathOfThread(startedThreadId));
    },
    onFinish: (state) => {
      if (document.hidden || !document.hasFocus()) {
        let body = "Conversation finished";
        const lastMessage = state.messages.at(-1);
        if (lastMessage) {
          const textContent = textOfMessage(lastMessage);
          if (textContent) {
            body =
              textContent.length > 200
                ? textContent.substring(0, 200) + "..."
                : textContent;
          }
        }
        showNotification(state.title, { body });
      }
    },
  });

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      void sendMessage(threadId, message);
    },
    [sendMessage, threadId],
  );

  const handleStop = useCallback(async () => {
    await thread.stop();
  }, [thread]);

  const inputStatus = thread.error
    ? "error"
    : thread.isLoading
      ? "streaming"
      : "ready";

  const inputDisabled =
    env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ||
    isUploading ||
    runtimeProfileLoading ||
    runtimeProfileSaving;

  const currentMode = settings.context.mode ?? "flash";
  const runtimeModeCopy = t.workspace.runtimeMode;

  const handleSwitchMode = useCallback(
    async (mode: "sandbox" | "host") => {
      if (runtimeProfile.locked || mode === runtimeProfile.execution_mode || isMock) {
        return;
      }

      setRuntimeProfileSaving(true);
      try {
        const updated = await updateRuntimeProfile(threadId, {
          execution_mode: mode,
          host_workdir: runtimeProfile.host_workdir ?? null,
        });
        setRuntimeProfile(updated);
      } catch (error) {
        console.error("Failed to update runtime profile:", error);
      } finally {
        setRuntimeProfileSaving(false);
      }
    },
    [isMock, runtimeProfile.execution_mode, runtimeProfile.host_workdir, runtimeProfile.locked, threadId],
  );

  return (
    <ThreadContext.Provider value={{ thread, isMock }}>
      <ChatBox threadId={threadId}>
        <div className="relative flex size-full min-h-0 flex-col">
          <header
            className={cn(
              "absolute top-0 right-0 left-0 z-30 flex h-14 shrink-0 items-center gap-2 px-4",
              isNewThread
                ? "bg-background/0 backdrop-blur-none"
                : "bg-background/72 shadow-xs backdrop-blur-xl",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center text-sm font-medium">
              {!isNewThread ? (
                <ThreadTitle threadId={threadId} thread={thread} />
              ) : (
                <span className="sr-only">{t.pages.newChat}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <WorkingDirectoryTrigger />
              {!isNewThread ? <ExportTrigger threadId={threadId} /> : null}
              {!isNewThread ? <ArtifactTrigger /> : null}
            </div>
          </header>

          {isNewThread ? (
            <main className="flex min-h-0 flex-1 items-center overflow-y-auto px-4 pb-10 pt-20">
              <NewChatStage
                hero={<Welcome className="sm:pb-1" mode={currentMode} />}
                controls={
                  <RuntimeModeToggle
                    mode={runtimeProfile.execution_mode}
                    locked={runtimeProfile.locked}
                    saving={runtimeProfileSaving}
                    hostDirPath={runtimeProfile.host_workdir}
                    copy={runtimeModeCopy}
                    onSwitch={handleSwitchMode}
                  />
                }
                composer={
                  <div className="relative w-full">
                    <div className="absolute -top-4 right-0 left-0 z-0">
                      <div className="absolute right-0 bottom-0 left-0">
                        <TodoList
                          className="bg-background/10"
                          todos={thread.values.todos ?? []}
                          hidden={
                            !thread.values.todos ||
                            thread.values.todos.length === 0
                          }
                        />
                      </div>
                    </div>
                    <InputBox
                      className="w-full bg-background/72 shadow-[0_34px_80px_-52px_rgba(70,60,41,0.4)] ring-1 ring-black/6 backdrop-blur-xl"
                      isNewThread={isNewThread}
                      threadId={threadId}
                      autoFocus
                      status={inputStatus}
                      context={settings.context}
                      disabled={inputDisabled}
                      workspacePaths={workspacePaths}
                      onContextChange={(context) =>
                        setSettings("context", context)
                      }
                      onSubmit={handleSubmit}
                      onStop={handleStop}
                    />
                    {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ? (
                      <div className="text-muted-foreground/67 w-full pt-4 text-center text-xs">
                        {t.common.notAvailableInDemoMode}
                      </div>
                    ) : null}
                  </div>
                }
              />
            </main>
          ) : (
            <main className="flex min-h-0 flex-1 flex-col">
              <div className="flex size-full justify-center">
                <MessageList
                  className="size-full pt-12 pb-52"
                  threadId={threadId}
                  thread={thread}
                />
              </div>

              <div className="absolute right-0 bottom-0 left-0 z-30 flex justify-center px-4 pb-4">
                <div className="relative w-full max-w-(--container-width-md)">
                  <div className="absolute -top-4 right-0 left-0 z-0">
                    <div className="absolute right-0 bottom-0 left-0">
                      <TodoList
                        className="bg-background/10"
                        todos={thread.values.todos ?? []}
                        hidden={
                          !thread.values.todos ||
                          thread.values.todos.length === 0
                        }
                      />
                    </div>
                  </div>
                  <InputBox
                    className="w-full bg-background/72 shadow-[0_34px_80px_-52px_rgba(70,60,41,0.4)] ring-1 ring-black/6 backdrop-blur-xl"
                    isNewThread={isNewThread}
                    threadId={threadId}
                    autoFocus={false}
                    status={inputStatus}
                    context={settings.context}
                    disabled={inputDisabled}
                    extraHeader={
                      <RuntimeModeToggle
                        mode={runtimeProfile.execution_mode}
                        locked={runtimeProfile.locked}
                        saving={runtimeProfileSaving}
                        hostDirPath={runtimeProfile.host_workdir}
                        copy={runtimeModeCopy}
                        onSwitch={handleSwitchMode}
                      />
                    }
                    workspacePaths={workspacePaths}
                    onContextChange={(context) =>
                      setSettings("context", context)
                    }
                    onSubmit={handleSubmit}
                    onStop={handleStop}
                  />
                </div>
              </div>
            </main>
          )}
        </div>
      </ChatBox>
    </ThreadContext.Provider>
  );
}
