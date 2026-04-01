"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  WorkingDirectoryTrigger,
} from "@/components/workspace/artifacts";
import { ChatBox, useSpecificChatMode, useThreadChat } from "@/components/workspace/chats";
import { ExportTrigger } from "@/components/workspace/export-trigger";
import { InputBox } from "@/components/workspace/input-box";
import { MessageList } from "@/components/workspace/messages";
import { ThreadContext } from "@/components/workspace/messages/context";
import { NewChatStage } from "@/components/workspace/new-chat-stage";
import { RuntimeModeToggle } from "@/components/workspace/runtime-mode-toggle";
import { SaveToNotebookTrigger } from "@/components/workspace/save-to-notebook-trigger";
import { ThreadRequestErrorAlert } from "@/components/workspace/thread-request-error-alert";
import { ThreadTitle } from "@/components/workspace/thread-title";
import { TodoList } from "@/components/workspace/todo-list";
import { TokenUsageIndicator } from "@/components/workspace/token-usage-indicator";
import { Welcome } from "@/components/workspace/welcome";
import { ToolActivityTimeline } from "@/components/workspace/messages/tool-activity-timeline";
import { getAPIClient } from "@/core/api";
import { loadThreadFilesTree } from "@/core/files";
import { useI18n } from "@/core/i18n/hooks";
import { useNotification } from "@/core/notification/hooks";
import {
  type RuntimeProfile,
  fetchRuntimeProfile,
  updateRuntimeProfile,
} from "@/core/runtime";
import { useLocalSettings } from "@/core/settings";
import {
  derivePendingClarification,
  derivePendingPermissionRequest,
  type PermissionReplayPayload,
} from "@/core/threads";
import { getThreadRequestErrorCopy } from "@/core/threads/error-copy";
import { useThreadStream } from "@/core/threads/hooks";
import { pathOfProjectThread, pathOfThread, textOfMessage } from "@/core/threads/utils";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export default function ChatThreadPage() {
  const { t } = useI18n();
  const pathname = usePathname();
  const params = useParams<{ project_id?: string }>();
  const searchParams = useSearchParams();
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
  const [isResolvingPermission, setIsResolvingPermission] = useState(false);
  const [resolvedPermissionRequestIds, setResolvedPermissionRequestIds] = useState<string[]>([]);

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
      if (pathname.startsWith("/workspace/projects/") && params.project_id) {
        history.replaceState(
          null,
          "",
          pathOfProjectThread(params.project_id, startedThreadId),
        );
      } else {
        history.replaceState(null, "", pathOfThread(startedThreadId));
      }
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
                ? `${textContent.substring(0, 200)}...`
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
  const seededDraft = searchParams.get("draft") ?? "";
  const threadError = useMemo(
    () => getThreadRequestErrorCopy(thread.error, t.workspace.requestError),
    [thread.error, t],
  );
  const pendingClarification = useMemo(
    () => derivePendingClarification(thread.messages),
    [thread.messages],
  );
  const pendingPermissionRequest = useMemo(
    () => {
      const derived = derivePendingPermissionRequest(thread.messages);
      if (!derived) {
        return null;
      }
      const persistedResolvedIds = thread.values.resolved_permission_request_ids ?? [];
      return resolvedPermissionRequestIds.includes(derived.requestId) ||
          persistedResolvedIds.includes(derived.requestId)
        ? null
        : derived;
    },
    [resolvedPermissionRequestIds, thread.messages, thread.values.resolved_permission_request_ids],
  );

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
    [
      isMock,
      runtimeProfile.execution_mode,
      runtimeProfile.host_workdir,
      runtimeProfile.locked,
      threadId,
    ],
  );

  const handleClarificationSelect = useCallback(
    (option: string) => {
      handleSubmit({
        text: option,
        files: [],
      });
    },
    [handleSubmit],
  );

  const handleReplaySubmit = useCallback(
    (payload: PermissionReplayPayload) => {
      const additionalKwargs =
        payload.additional_kwargs && typeof payload.additional_kwargs === "object"
          ? { ...payload.additional_kwargs }
          : {};
      if (payload.files.length > 0 && !("files" in additionalKwargs)) {
        additionalKwargs.files = payload.files;
      }

      const shortcutSelections =
        additionalKwargs.shortcut_selections &&
        typeof additionalKwargs.shortcut_selections === "object"
          ? (additionalKwargs.shortcut_selections as {
              contexts?: Array<{ value: string; kind: "file" | "directory" }>;
              skills?: string[];
              mcpTools?: string[];
              cliTools?: string[];
            })
          : undefined;
      const implicitMentions =
        Array.isArray(additionalKwargs.implicit_mentions)
          ? additionalKwargs.implicit_mentions
          : [];

      void thread.submit(
        {
          messages: [
            {
              type: "human",
              content: [
                {
                  type: "text",
                  text: payload.text,
                },
              ],
              additional_kwargs: additionalKwargs,
            },
          ],
        },
        {
          threadId,
          streamSubgraphs: true,
          streamResumable: true,
          config: {
            recursion_limit: 1000,
          },
          context: {
            ...settings.context,
            ...threadRuntimeContext,
            requested_skills: shortcutSelections?.skills ?? [],
            selected_contexts: shortcutSelections?.contexts ?? [],
            selected_mcp_tools: shortcutSelections?.mcpTools ?? [],
            selected_cli_tools: shortcutSelections?.cliTools ?? [],
            implicit_mentions: implicitMentions,
            thinking_enabled: currentMode !== "flash",
            is_plan_mode: currentMode === "pro" || currentMode === "ultra",
            subagent_enabled: currentMode === "ultra",
            project_id: thread.values.project?.project_id,
            project_phase: thread.values.project?.project_phase,
            primary_plan_id: thread.values.project?.primary_plan_id,
            project_name: thread.values.project?.project_name,
            reasoning_effort:
              settings.context.reasoning_effort ??
              (currentMode === "ultra"
                ? "high"
                : currentMode === "pro"
                  ? "medium"
                  : currentMode === "thinking"
                    ? "low"
                    : undefined),
            thread_id: threadId,
          },
        },
      );
    },
    [
      currentMode,
      settings.context,
      thread,
      threadId,
      threadRuntimeContext,
    ],
  );

  const handlePermissionDecision = useCallback(
    async (decision: "allow" | "allow_session" | "deny") => {
      if (!pendingPermissionRequest) {
        return;
      }
      try {
        setIsResolvingPermission(true);
        const resolution = await getAPIClient(isMock).resolvePermission(
          threadId,
          pendingPermissionRequest.requestId,
          decision,
        ) as {
          ok?: boolean;
          original_message_text?: string;
          consumed?: boolean;
          replay_payload?: PermissionReplayPayload;
        };
        if (resolution.ok === true) {
          setResolvedPermissionRequestIds((current) =>
            current.includes(pendingPermissionRequest.requestId)
              ? current
              : [...current, pendingPermissionRequest.requestId],
          );
        }
        if (
          resolution.ok === true &&
          (decision === "allow" || decision === "allow_session") &&
          resolution.consumed === true &&
          resolution.replay_payload
        ) {
          handleReplaySubmit(resolution.replay_payload);
        } else if (
          resolution.ok === true &&
          (decision === "allow" || decision === "allow_session") &&
          resolution.consumed === true &&
          typeof resolution.original_message_text === "string" &&
          resolution.original_message_text.trim().length > 0
        ) {
          handleReplaySubmit({
            text: resolution.original_message_text,
            files: [],
            additional_kwargs: {},
          });
        }
      } catch (error) {
        console.error("Failed to resolve permission request:", error);
      } finally {
        setIsResolvingPermission(false);
      }
    },
    [handleReplaySubmit, isMock, pendingPermissionRequest, threadId],
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
              {!isNewThread ? (
                <TokenUsageIndicator messages={thread.messages} />
              ) : null}
              <WorkingDirectoryTrigger />
              {!isNewThread ? <ExportTrigger threadId={threadId} /> : null}
              {!isNewThread ? <SaveToNotebookTrigger threadId={threadId} /> : null}
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
                    onSwitch={handleSwitchMode}
                    copy={t.workspace.runtimeMode}
                  />
                }
                composer={
                  <div className="flex w-full flex-col gap-3">
                    {threadError ? <ThreadRequestErrorAlert error={threadError} /> : null}
                    <InputBox
                      className="w-full"
                      isNewThread={isNewThread}
                      threadId={threadId}
                      initialValue={seededDraft}
                      autoFocus
                      status={inputStatus}
                      disabled={inputDisabled}
                      pendingClarification={pendingClarification}
                      workspacePaths={workspacePaths}
                      context={settings.context}
                      onContextChange={(context) => setSettings("context", context)}
                      onSubmit={handleSubmit}
                      onStop={handleStop}
                    />
                  </div>
                }
              />
            </main>
          ) : (
            <main className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 justify-center pt-14">
                <MessageList
                  className="size-full"
                  threadId={threadId}
                  thread={thread}
                  pendingClarification={pendingClarification}
                  pendingPermissionRequest={pendingPermissionRequest}
                  onClarificationSelect={handleClarificationSelect}
                  onPermissionDecision={handlePermissionDecision}
                  isResolvingPermission={isResolvingPermission}
                />
              </div>
              <div className="shrink-0 px-4 pb-4">
                <div className="mx-auto flex w-full max-w-(--container-width-md) flex-col gap-3 pt-4">
                  <div className="absolute -top-4 right-0 left-0 z-0">
                    <div className="absolute right-0 bottom-0 left-0">
                      <ToolActivityTimeline
                        className="bg-background/5"
                        timeline={thread.values.tool_activity_timeline ?? []}
                        hidden={
                          !thread.values.tool_activity_timeline ||
                          thread.values.tool_activity_timeline.length === 0
                        }
                      />
                      <TodoList
                        className="bg-background/5"
                        todos={thread.values.todos ?? []}
                        hidden={
                          !thread.values.todos ||
                          thread.values.todos.length === 0
                        }
                      />
                    </div>
                  </div>

                  {threadError ? <ThreadRequestErrorAlert error={threadError} /> : null}
                  <InputBox
                    className="bg-background/5 w-full"
                    isNewThread={isNewThread}
                    threadId={threadId}
                    initialValue={seededDraft}
                    status={inputStatus}
                    disabled={inputDisabled}
                    pendingClarification={pendingClarification}
                    workspacePaths={workspacePaths}
                    context={settings.context}
                    onContextChange={(context) => setSettings("context", context)}
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
