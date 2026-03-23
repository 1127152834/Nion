"use client";

import {
  LightbulbIcon,
  RocketIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import { useCallback } from "react";

import { type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
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
import {
  ModeHoverGuide,
  type AgentMode,
} from "@/components/workspace/mode-hover-guide";
import { NewChatStage } from "@/components/workspace/new-chat-stage";
import { ThreadTitle } from "@/components/workspace/thread-title";
import { TodoList } from "@/components/workspace/todo-list";
import { Welcome } from "@/components/workspace/welcome";
import { useI18n } from "@/core/i18n/hooks";
import { useNotification } from "@/core/notification/hooks";
import { useLocalSettings } from "@/core/settings";
import { useThreadStream } from "@/core/threads/hooks";
import {
  pathOfThread,
  textOfMessage,
} from "@/core/threads/utils";
import { env } from "@/env";
import { cn } from "@/lib/utils";

type ChatMode = AgentMode;

const reasoningEffortByMode: Record<
  ChatMode,
  "minimal" | "low" | "medium" | "high"
> = {
  flash: "minimal",
  thinking: "low",
  pro: "medium",
  ultra: "high",
};

function ConversationModeToggle({
  mode,
  onChange,
}: {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}) {
  const { t } = useI18n();

  const items = [
    { mode: "flash" as const, label: t.inputBox.flashMode, icon: ZapIcon },
    {
      mode: "thinking" as const,
      label: t.inputBox.reasoningMode,
      icon: LightbulbIcon,
    },
    { mode: "pro" as const, label: t.inputBox.proMode, icon: SparklesIcon },
    { mode: "ultra" as const, label: t.inputBox.ultraMode, icon: RocketIcon },
  ];

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-[1.55rem] bg-[linear-gradient(180deg,rgba(250,248,243,0.94),rgba(239,234,225,0.9))] p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.92),inset_0_-1px_2px_rgba(102,88,63,0.08)]">
      {items.map(({ mode: itemMode, label, icon: Icon }) => {
        const active = mode === itemMode;
        return (
          <ModeHoverGuide key={itemMode} mode={itemMode}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-[1.15rem] px-3.5 text-foreground/62 transition-all",
                active &&
                  "bg-background/95 text-foreground shadow-[0_10px_24px_-18px_rgba(70,60,41,0.42)]",
                itemMode === "ultra" && active && "text-[#8a6a10]",
              )}
              onClick={() => onChange(itemMode)}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Button>
          </ModeHoverGuide>
        );
      })}
    </div>
  );
}

export default function ChatPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useLocalSettings();

  const { threadId, isNewThread, setIsNewThread, isMock } = useThreadChat();
  useSpecificChatMode();

  const { showNotification } = useNotification();

  const [thread, sendMessage, isUploading] = useThreadStream({
    threadId: isNewThread ? undefined : threadId,
    context: settings.context,
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

  const handleModeChange = useCallback(
    (mode: ChatMode) => {
      setSettings("context", {
        mode,
        reasoning_effort: reasoningEffortByMode[mode],
      });
    },
    [setSettings],
  );

  const inputStatus = thread.error
    ? "error"
    : thread.isLoading
      ? "streaming"
      : "ready";

  const inputDisabled =
    env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" || isUploading;

  const currentMode = settings.context.mode ?? "flash";

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
                  <div className="flex w-full flex-col items-center gap-5">
                    <ConversationModeToggle
                      mode={currentMode}
                      onChange={handleModeChange}
                    />
                  </div>
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
