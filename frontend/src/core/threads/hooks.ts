import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

import { getAPIClient } from "../api";
import type { ThreadClientSearchParams } from "../api/thread-client";
import { reduceChildRunEvent } from "../child-runs/reducer";
import { useI18n } from "../i18n/hooks";
import type { FileInMessage } from "../messages/utils";
import { useUpdateSubtask } from "../tasks/context";
import type { UploadedFileInfo } from "../uploads";
import { getFilesForUpload, uploadFiles } from "../uploads";
import { uuid } from "../utils/uuid";

import { removeThreadFromSearchCache } from "./cache";
import { getThreadRequestErrorCopy, getThreadRequestErrorMessage } from "./error-copy";
import {
  mergeThreadMessages,
  reconcileLoadedThreadMessages,
} from "./thread-state";
import { resolvePreferredThreadTitle } from "./title";
import type {
  AIMessage,
  AgentThread,
  AgentThreadContext,
  AgentThreadState,
  BaseStream,
  Message,
  QueuedThreadMessageFile,
  QueuedThreadMessage,
  ThreadSubmitResult,
  ThreadSubmitOptions,
  ThreadSubmitPayload,
} from "./types";

export type ToolEndEvent = {
  name: string;
  data: unknown;
};

type ThreadListSearchParams = ThreadClientSearchParams & {
  scope?: "general" | "notebook_assistant" | "all";
};

type PendingQueuedThreadMessage = {
  id: string;
  threadId: string;
  text: string;
  status: "active" | "queued";
  createdAt: string;
  files: QueuedThreadMessageFile[];
  message: PromptInputMessage;
  filesForSubmit: FileInMessage[];
  extraContext?: Record<string, unknown>;
};

export type ThreadStreamOptions = {
  threadId?: string | null | undefined;
  context: Omit<
    AgentThreadContext,
    "thread_id" | "is_plan_mode" | "thinking_enabled" | "subagent_enabled"
  > & {
    mode: "flash" | "thinking" | "pro" | "ultra" | undefined;
    reasoning_effort?: "minimal" | "low" | "medium" | "high";
  };
  isMock?: boolean;
  onStart?: (threadId: string) => void;
  onFinish?: (state: AgentThreadState) => void;
  onToolEnd?: (event: ToolEndEvent) => void;
};

const EMPTY_THREAD_STATE: AgentThreadState = {
  title: "Untitled",
  messages: [],
  artifacts: [],
  todos: [],
};

const CHILD_RUN_EVENT_TYPES = new Set([
  "child_run_created",
  "child_run_running",
  "child_run_completed",
  "child_run_failed",
  "child_run_closed",
]);

function updateThreadSearchCacheEntry(
  oldData: Array<AgentThread> | undefined,
  threadId: string | null,
  updater: (thread: AgentThread) => AgentThread,
) {
  if (!oldData || !threadId) {
    return oldData;
  }

  return oldData.map((thread) =>
    thread.thread_id === threadId ? updater(thread) : thread,
  );
}

function insertThreadSearchCacheEntry(
  oldData: Array<AgentThread> | undefined,
  threadId: string,
) {
  const existing = oldData ?? [];
  if (existing.some((thread) => thread.thread_id === threadId)) {
    return existing;
  }

  const placeholder: AgentThread = {
    thread_id: threadId,
    updated_at: new Date().toISOString(),
    values: {
      ...EMPTY_THREAD_STATE,
      title: "Untitled",
      messages: [],
    },
  };

  return [placeholder, ...existing];
}

function normalizeQueuedMessageFile(file: unknown): QueuedThreadMessageFile | null {
  if (!file || typeof file !== "object") {
    return null;
  }
  const candidate = file as Record<string, unknown>;
  const filename =
    typeof candidate.filename === "string" && candidate.filename.trim()
      ? candidate.filename
      : "attachment";
  return {
    filename,
    size: typeof candidate.size === "number" ? candidate.size : undefined,
    path: typeof candidate.path === "string" ? candidate.path : undefined,
    artifactUrl:
      typeof candidate.artifactUrl === "string"
        ? candidate.artifactUrl
        : typeof candidate.artifact_url === "string"
          ? candidate.artifact_url
          : undefined,
    mediaType:
      typeof candidate.mediaType === "string"
        ? candidate.mediaType
        : typeof candidate.media_type === "string"
          ? candidate.media_type
          : undefined,
    status: candidate.status === "uploading" ? "uploading" : "uploaded",
  };
}

function filesForSubmitFromQueuedFiles(
  files: QueuedThreadMessageFile[],
): FileInMessage[] {
  return files
    .filter((file) => typeof file.path === "string" && file.path.length > 0)
    .map((file) => ({
      filename: file.filename,
      size: file.size ?? 0,
      path: file.path,
      status: "uploaded" as const,
    }));
}

function queuedMessageToPromptMessage(
  message: QueuedThreadMessage,
): PromptInputMessage {
  return {
    text: message.message?.text ?? message.text,
    files: [],
    implicitMentions: message.message?.implicitMentions,
    shortcutSelections: message.message?.shortcutSelections,
  };
}

function hydrateQueuedMessage(
  message: unknown,
  threadId: string,
): PendingQueuedThreadMessage | null {
  if (!message || typeof message !== "object") {
    return null;
  }
  const candidate = message as Partial<QueuedThreadMessage> & {
    files?: unknown;
  };
  const text =
    typeof candidate.text === "string"
      ? candidate.text
      : typeof candidate.message?.text === "string"
        ? candidate.message.text
        : "";
  const files = Array.isArray(candidate.files)
    ? candidate.files
        .map((file) => normalizeQueuedMessageFile(file))
        .filter((file): file is QueuedThreadMessageFile => file !== null)
    : [];
  const queuedMessage: QueuedThreadMessage = {
    id: typeof candidate.id === "string" ? candidate.id : uuid(),
    threadId:
      typeof candidate.threadId === "string" ? candidate.threadId : threadId,
    text,
    status: candidate.status === "active" ? "active" : "queued",
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : new Date().toISOString(),
    files,
    message: candidate.message,
    extraContext:
      candidate.extraContext && typeof candidate.extraContext === "object"
        ? candidate.extraContext
        : undefined,
  };
  return {
    ...queuedMessage,
    message: queuedMessageToPromptMessage(queuedMessage),
    filesForSubmit: filesForSubmitFromQueuedFiles(files),
  };
}

function serializeQueuedMessage(
  message: PendingQueuedThreadMessage,
): QueuedThreadMessage {
  return {
    id: message.id,
    threadId: message.threadId,
    text: message.text,
    status: message.status,
    createdAt: message.createdAt,
    files: message.files,
    message: {
      text: message.message.text,
      files: [],
      implicitMentions: message.message.implicitMentions,
      shortcutSelections: message.message.shortcutSelections,
    },
    extraContext: message.extraContext,
  };
}

function uploadedFilesToQueueFiles(
  uploadedFiles: UploadedFileInfo[],
  sourceFiles: PromptInputMessage["files"],
): QueuedThreadMessageFile[] {
  return uploadedFiles.map((info, index) => ({
    filename: info.filename,
    size: Number(info.size) || 0,
    path: info.virtual_path,
    artifactUrl: info.artifact_url,
    mediaType: sourceFiles[index]?.mediaType,
    status: "uploaded" as const,
  }));
}

function waitingQueuedMessages(
  messages: PendingQueuedThreadMessage[],
): PendingQueuedThreadMessage[] {
  return messages
    .filter((message) => message.status !== "active")
    .map((message) => ({
      ...message,
      status: "queued" as const,
    }));
}

export function useThreadStream({
  threadId,
  context,
  isMock,
  onStart,
  onFinish,
  onToolEnd,
}: ThreadStreamOptions) {
  const { t, locale } = useI18n();
  // Track the thread ID that is currently streaming to handle thread changes during streaming
  const [onStreamThreadId, setOnStreamThreadId] = useState(() => threadId);
  // Ref to track current thread ID across async callbacks without causing re-renders,
  // and to allow access to the current thread id in onUpdateEvent
  const threadIdRef = useRef<string | null>(threadId ?? null);
  // Track which thread the currently rendered in-memory state belongs to.
  const loadedStateThreadIdRef = useRef<string | null>(threadId ?? null);
  const startedRef = useRef(false);

  const listeners = useRef({
    onStart,
    onFinish,
    onToolEnd,
  });

  // Keep listeners ref updated with latest callbacks
  useEffect(() => {
    listeners.current = { onStart, onFinish, onToolEnd };
  }, [onStart, onFinish, onToolEnd]);

  useEffect(() => {
    const normalizedThreadId = threadId ?? null;
    if (!normalizedThreadId) {
      // Just reset for new thread creation when threadId becomes null/undefined
      startedRef.current = false;
    }
    setOnStreamThreadId(normalizedThreadId);
    threadIdRef.current = normalizedThreadId;
  }, [threadId]);

  const _handleOnStart = useCallback((id: string) => {
    if (!startedRef.current) {
      listeners.current.onStart?.(id);
      startedRef.current = true;
    }
  }, []);

  const isActiveStreamThread = useCallback((candidateThreadId: string | null) => {
    if (!candidateThreadId) {
      return false;
    }
    return threadIdRef.current === candidateThreadId;
  }, []);

  const handleStreamStart = useCallback(
    (_threadId: string) => {
      threadIdRef.current = _threadId;
      loadedStateThreadIdRef.current = _threadId;
      _handleOnStart(_threadId);
    },
    [_handleOnStart],
  );

  const queryClient = useQueryClient();
  const updateSubtask = useUpdateSubtask();
  const apiClient = useMemo(() => getAPIClient(isMock), [isMock]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [values, setValues] = useState<AgentThreadState>(EMPTY_THREAD_STATE);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [queuedMessages, setQueuedMessages] = useState<PendingQueuedThreadMessage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const valuesRef = useRef(values);
  const messagesRef = useRef(messages);
  const queuedMessagesRef = useRef<PendingQueuedThreadMessage[]>([]);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    queuedMessagesRef.current = queuedMessages;
  }, [queuedMessages]);

  const updateThreadSearchCache = useCallback(
    (updater: (thread: AgentThread) => AgentThread) => {
      const currentThreadId = threadIdRef.current;
      if (!currentThreadId) {
        return;
      }
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread> | undefined) =>
          updateThreadSearchCacheEntry(oldData, currentThreadId, updater),
      );
    },
    [queryClient],
  );

  const insertThreadSearchCache = useCallback(
    (threadId: string) => {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread> | undefined) =>
          insertThreadSearchCacheEntry(oldData, threadId),
      );
    },
    [queryClient],
  );

  const persistQueuedMessages = useCallback(
    async (
      targetThreadId: string,
      nextQueuedMessages: PendingQueuedThreadMessage[],
    ) => {
      await apiClient.updateState(targetThreadId, {
        values: {
          queued_messages: nextQueuedMessages.map(serializeQueuedMessage),
        },
      });
      updateThreadSearchCache((thread) => ({
        ...thread,
        updated_at: new Date().toISOString(),
        values: {
          ...thread.values,
          queued_messages: nextQueuedMessages.map(serializeQueuedMessage),
        },
      }));
    },
    [apiClient, updateThreadSearchCache],
  );

  const applyQueuedMessages = useCallback(
    async (
      targetThreadId: string,
      nextQueuedMessages: PendingQueuedThreadMessage[],
    ) => {
      queuedMessagesRef.current = nextQueuedMessages;
      setQueuedMessages(nextQueuedMessages);
      setValues((current) => ({
        ...current,
        queued_messages: nextQueuedMessages.map(serializeQueuedMessage),
      }));
      await persistQueuedMessages(targetThreadId, nextQueuedMessages);
    },
    [persistQueuedMessages],
  );

  useEffect(() => {
    const currentThreadId = onStreamThreadId;
    if (!currentThreadId) {
      setMessages([]);
      setValues(EMPTY_THREAD_STATE);
      setQueuedMessages([]);
      queuedMessagesRef.current = [];
      setError(null);
      setIsThreadLoading(false);
      loadedStateThreadIdRef.current = null;
      return;
    }

    let cancelled = false;

    setError(null);
    setIsThreadLoading(true);
    void apiClient
      .getState<AgentThreadState>(currentThreadId)
      .then((state) => {
        if (cancelled) {
          return;
        }
        if (!isActiveStreamThread(currentThreadId)) {
          return;
        }
        const incomingMessages = state.values?.messages ?? [];
        const mergedMessages = reconcileLoadedThreadMessages({
          currentStateThreadId: loadedStateThreadIdRef.current,
          loadedThreadId: currentThreadId,
          existingMessages: messagesRef.current,
          incomingMessages,
        });
        loadedStateThreadIdRef.current = currentThreadId;
        const nextValues = {
          ...EMPTY_THREAD_STATE,
          ...(state.values ?? {}),
          messages: mergedMessages,
        };
        const hydratedQueuedMessages = Array.isArray(state.values?.queued_messages)
          ? state.values.queued_messages
              .map((item) => hydrateQueuedMessage(item, currentThreadId))
              .filter((item): item is PendingQueuedThreadMessage => item !== null)
          : [];
        setValues(nextValues);
        setMessages(mergedMessages);
        queuedMessagesRef.current = hydratedQueuedMessages;
        setQueuedMessages(hydratedQueuedMessages);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsThreadLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, isActiveStreamThread, onStreamThreadId]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current && threadIdRef.current) {
        void apiClient.cancelRun(threadIdRef.current);
      }
    };
  }, [apiClient]);

  useEffect(() => {
    const activeThreadIdAtEffectStart = onStreamThreadId;
    return () => {
      if (abortControllerRef.current && activeThreadIdAtEffectStart) {
        void apiClient.cancelRun(activeThreadIdAtEffectStart);
      }
    };
  }, [apiClient, onStreamThreadId]);

  const submit = useCallback(
    async (
      payload: ThreadSubmitPayload,
      options: ThreadSubmitOptions,
    ): Promise<ThreadSubmitResult> => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setError(null);
      setIsLoading(true);

      try {
        const requestedThreadId = options.threadId;
        await apiClient.streamRun(options.threadId, payload, options, {
          signal: abortController.signal,
          onCreated: (createdThreadId) => {
            handleStreamStart(createdThreadId);
            setOnStreamThreadId(createdThreadId);
            insertThreadSearchCache(createdThreadId);
          },
          onEvent: (eventType, eventData) => {
            const activeStreamThreadId = threadIdRef.current ?? requestedThreadId ?? null;
            if (!isActiveStreamThread(activeStreamThreadId)) {
              return;
            }
            if (eventType === "messages-tuple") {
              const nextMessage = eventData as unknown as Message;
              setMessages((current) => {
                const merged = mergeThreadMessages(current, [nextMessage]);
                updateThreadSearchCache((thread) => ({
                  ...thread,
                  updated_at: new Date().toISOString(),
                  values: {
                    ...thread.values,
                    messages: merged,
                  },
                }));
                return merged;
              });
              if (nextMessage.type === "tool" && nextMessage.name) {
                listeners.current.onToolEnd?.({
                  name: nextMessage.name,
                  data: nextMessage,
                });
              }
              if (
                nextMessage.type === "ai" &&
                nextMessage.tool_calls?.some((toolCall) => toolCall.name === "task")
              ) {
                for (const toolCall of nextMessage.tool_calls ?? []) {
                  if (toolCall.name !== "task" || !toolCall.id) {
                    continue;
                  }
                  updateSubtask({
                    id: toolCall.id,
                    latestMessage: nextMessage as AIMessage,
                  });
                }
              }
            }

            if (
              eventType === "custom" &&
              typeof eventData?.type === "string" &&
              CHILD_RUN_EVENT_TYPES.has(eventData.type)
            ) {
              setValues((current) => ({
                ...current,
                child_runs: reduceChildRunEvent(
                  current.child_runs ?? {},
                  eventData as Parameters<typeof reduceChildRunEvent>[1],
                ),
              }));
            }

            if (eventType === "values") {
              const snapshot = eventData as Partial<AgentThreadState>;
              const snapshotMessages = Array.isArray(snapshot.messages)
                ? snapshot.messages
                : [];
              const mergedMessages = mergeThreadMessages(
                messagesRef.current,
                snapshotMessages,
              );
              setMessages(mergedMessages);
              setValues((current) => {
                const nextTitle = resolvePreferredThreadTitle({
                  currentTitle: current.title,
                  incomingTitle: snapshot.title,
                });

                return {
                  ...current,
                  ...snapshot,
                  title: nextTitle ?? current.title,
                  messages: mergedMessages,
                  tool_activity_timeline: Array.isArray(snapshot.tool_activity_timeline)
                    ? snapshot.tool_activity_timeline
                    : current.tool_activity_timeline,
                  latest_tool_activity:
                    snapshot.latest_tool_activity ?? current.latest_tool_activity,
                };
              });
              updateThreadSearchCache((thread) => ({
                ...thread,
                updated_at: new Date().toISOString(),
                values: {
                  ...thread.values,
                  ...snapshot,
                  title: resolvePreferredThreadTitle({
                    currentTitle: thread.values?.title,
                    incomingTitle: snapshot.title,
                  }) ?? thread.values?.title ?? EMPTY_THREAD_STATE.title,
                  messages: mergedMessages,
                },
              }));
            }

            if (
              eventType === "custom"
              && typeof eventData?.type === "string"
              && CHILD_RUN_EVENT_TYPES.has(eventData.type)
            ) {
              setValues((current) => ({
                ...current,
                child_runs: reduceChildRunEvent(
                  current.child_runs ?? {},
                  eventData as Parameters<typeof reduceChildRunEvent>[1],
                ),
              }));
            }

            if (eventType === "end") {
              listeners.current.onFinish?.({
                ...valuesRef.current,
                messages: messagesRef.current,
              });

              const finalThreadId = threadIdRef.current;
              if (finalThreadId) {
                void apiClient
                  .getState<AgentThreadState>(finalThreadId)
                  .then((state) => {
                    if (!isActiveStreamThread(finalThreadId)) {
                      return;
                    }
                    const snapshotMessages = Array.isArray(state.values?.messages)
                      ? state.values.messages
                      : [];
                    const mergedMessages = mergeThreadMessages(
                      messagesRef.current,
                      snapshotMessages,
                    );
                    setMessages(mergedMessages);
                    setValues((current) => ({
                      ...current,
                      ...(state.values ?? {}),
                      title:
                        resolvePreferredThreadTitle({
                          currentTitle: current.title,
                          incomingTitle: state.values?.title,
                        }) ?? current.title,
                      messages: mergedMessages,
                      tool_activity_timeline: Array.isArray(
                        state.values?.tool_activity_timeline,
                      )
                        ? state.values.tool_activity_timeline
                        : current.tool_activity_timeline,
                      latest_tool_activity:
                        state.values?.latest_tool_activity ??
                        current.latest_tool_activity,
                    }));

                    const refreshedTitle = state.values?.title;
                    if (refreshedTitle) {
                      updateThreadSearchCache((thread) => ({
                        ...thread,
                        updated_at: new Date().toISOString(),
                        values: {
                          ...thread.values,
                          ...(state.values ?? {}),
                          messages: mergedMessages,
                          title:
                            resolvePreferredThreadTitle({
                              currentTitle: thread.values?.title,
                              incomingTitle: refreshedTitle,
                            }) ?? thread.values?.title ?? EMPTY_THREAD_STATE.title,
                        },
                      }));
                    }
                  })
                  .catch(() => undefined);
              }
            }
          },
        });
        return "completed";
      } catch (streamError) {
        if (abortController.signal.aborted) {
          return "aborted";
        }
        setError(streamError);
        setOptimisticMessages([]);
        const errorCopy = getThreadRequestErrorCopy(
          streamError,
          t.workspace.requestError,
        );
        toast.error(errorCopy?.title ?? "Request failed.", {
          description:
            errorCopy?.description ??
            getThreadRequestErrorMessage(streamError) ??
            "Request failed.",
        });
        throw streamError;
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        setIsLoading(false);
        void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
      }
    },
    [apiClient, handleStreamStart, insertThreadSearchCache, isActiveStreamThread, queryClient, t.workspace.requestError, updateSubtask, updateThreadSearchCache],
  );

  // Optimistic messages shown before the server stream responds
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const sendInFlightRef = useRef(false);
  const activeQueuedMessageIdRef = useRef<string | null>(null);
  // Track message count before sending so we know when server has responded
  const prevMsgCountRef = useRef(messages.length);

  // Clear optimistic when server messages arrive (count increases)
  useEffect(() => {
    if (
      optimisticMessages.length > 0 &&
      messages.length > prevMsgCountRef.current
    ) {
      setOptimisticMessages([]);
    }
  }, [messages.length, optimisticMessages.length]);

  const buildThreadContext = useCallback(
    (
      targetThreadId: string,
      message: PromptInputMessage,
      extraContext?: Record<string, unknown>,
    ) => {
      const shortcutSelections = message.shortcutSelections;
      const implicitMentions = message.implicitMentions;
      return {
        ...extraContext,
        ...context,
        locale: context.locale ?? locale,
        requested_skills: shortcutSelections?.skills ?? [],
        selected_contexts: shortcutSelections?.contexts ?? [],
        selected_mcp_tools: shortcutSelections?.mcpTools ?? [],
        selected_cli_tools: shortcutSelections?.cliTools ?? [],
        implicit_mentions: implicitMentions ?? [],
        thinking_enabled: context.mode !== "flash",
        is_plan_mode: context.mode === "pro" || context.mode === "ultra",
        subagent_enabled: context.mode === "ultra",
        reasoning_effort:
          context.reasoning_effort ??
          (context.mode === "ultra"
            ? "high"
            : context.mode === "pro"
              ? "medium"
              : context.mode === "thinking"
                ? "low"
                : undefined),
        thread_id: targetThreadId,
      };
    },
    [context, locale],
  );

  const prepareFilesForMessage = useCallback(
    async (
      targetThreadId: string,
      message: PromptInputMessage,
    ): Promise<{
      queuedFiles: QueuedThreadMessageFile[];
      filesForSubmit: FileInMessage[];
    }> => {
      if (!message.files || message.files.length === 0) {
        return {
          queuedFiles: [],
          filesForSubmit: [],
        };
      }

      setIsUploading(true);
      try {
        const { files, missingCount: failedConversions } =
          getFilesForUpload(message.files);

        if (failedConversions > 0) {
          throw new Error(
            `Failed to prepare ${failedConversions} attachment(s) for upload. Please retry.`,
          );
        }

        if (files.length === 0) {
          return {
            queuedFiles: [],
            filesForSubmit: [],
          };
        }

        const uploadResponse = await uploadFiles(targetThreadId, files);
        const queuedFiles = uploadedFilesToQueueFiles(
          uploadResponse.files,
          message.files,
        );
        return {
          queuedFiles,
          filesForSubmit: filesForSubmitFromQueuedFiles(queuedFiles),
        };
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  const removeQueuedMessage = useCallback(
    async (messageId: string) => {
      const targetThreadId = threadIdRef.current;
      if (!targetThreadId) {
        return;
      }
      const nextQueuedMessages = queuedMessagesRef.current.filter(
        (item) => item.id !== messageId,
      );
      await applyQueuedMessages(targetThreadId, nextQueuedMessages);
    },
    [applyQueuedMessages],
  );

  const promoteQueuedMessage = useCallback(
    async (messageId: string) => {
      const targetThreadId = threadIdRef.current;
      if (!targetThreadId) {
        return;
      }
      const nextQueuedMessages = [...queuedMessagesRef.current];
      const targetIndex = nextQueuedMessages.findIndex(
        (item) => item.id === messageId,
      );
      if (targetIndex <= 0) {
        return;
      }
      const [selected] = nextQueuedMessages.splice(targetIndex, 1);
      nextQueuedMessages.unshift(selected!);
      await applyQueuedMessages(targetThreadId, nextQueuedMessages);
    },
    [applyQueuedMessages],
  );

  const flushNextQueuedMessage = useCallback(async () => {
    const targetThreadId = threadIdRef.current;
    if (!targetThreadId) {
      return null;
    }
    const waitingMessages = waitingQueuedMessages(queuedMessagesRef.current);
    const nextQueuedMessage = waitingMessages[0] ?? null;
    if (!nextQueuedMessage) {
      await applyQueuedMessages(targetThreadId, []);
      return null;
    }
    const remainingQueuedMessages = waitingMessages.slice(1);
    await applyQueuedMessages(targetThreadId, remainingQueuedMessages);
    return {
      ...nextQueuedMessage,
      status: "active" as const,
    };
  }, [applyQueuedMessages]);

  const runQueuedMessage = useCallback(
    async (queuedMessage: PendingQueuedThreadMessage) => {
      sendInFlightRef.current = true;
      activeQueuedMessageIdRef.current = queuedMessage.id;

      const text = queuedMessage.text.trim();
      prevMsgCountRef.current = messagesRef.current.length;

      const optimisticHumanMsg: Message = {
        type: "human",
        id: `opt-human-${Date.now()}`,
        content: text ? [{ type: "text", text }] : "",
        additional_kwargs:
          queuedMessage.filesForSubmit.length > 0
            ? { files: queuedMessage.filesForSubmit }
            : {},
      };

      setOptimisticMessages([optimisticHumanMsg]);
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread> | undefined) =>
          oldData?.map((threadEntry) =>
            threadEntry.thread_id === queuedMessage.threadId
              ? {
                  ...threadEntry,
                  updated_at: new Date().toISOString(),
                  values: {
                    ...threadEntry.values,
                    messages: [
                      ...(threadEntry.values?.messages ?? []),
                      optimisticHumanMsg,
                    ],
                  },
                }
              : threadEntry,
          ),
      );

      _handleOnStart(queuedMessage.threadId);

      const messageAdditionalKwargs: Record<string, unknown> = {};
      if (queuedMessage.filesForSubmit.length > 0) {
        messageAdditionalKwargs.files = queuedMessage.filesForSubmit;
      }
      if (queuedMessage.message.shortcutSelections) {
        messageAdditionalKwargs.shortcut_selections =
          queuedMessage.message.shortcutSelections;
      }
      if (
        queuedMessage.message.implicitMentions &&
        queuedMessage.message.implicitMentions.length > 0
      ) {
        messageAdditionalKwargs.implicit_mentions =
          queuedMessage.message.implicitMentions;
      }

      try {
        const submitResult = await submit(
          {
            messages: [
              {
                type: "human",
                content: [
                  {
                    type: "text",
                    text,
                  },
                ],
                additional_kwargs: messageAdditionalKwargs,
              },
            ],
          },
          {
            threadId: queuedMessage.threadId,
            streamSubgraphs: true,
            streamResumable: true,
            config: {
              recursion_limit: 1000,
            },
            context: buildThreadContext(
              queuedMessage.threadId,
              queuedMessage.message,
              queuedMessage.extraContext,
            ),
          },
        );
        return submitResult;
      } catch (error) {
        setOptimisticMessages([]);
        throw error;
      } finally {
        if (activeQueuedMessageIdRef.current === queuedMessage.id) {
          sendInFlightRef.current = false;
          activeQueuedMessageIdRef.current = null;
        }
        void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
      }
    },
    [buildThreadContext, queryClient, submit, _handleOnStart],
  );

  const drainQueuedMessages = useCallback(
    async (targetThreadId: string) => {
      let nextQueuedMessage = await flushNextQueuedMessage();
      while (nextQueuedMessage) {
        await applyQueuedMessages(targetThreadId, [
          nextQueuedMessage,
          ...waitingQueuedMessages(queuedMessagesRef.current),
        ]);
        const nextResult = await runQueuedMessage(nextQueuedMessage);
        if (nextResult !== "completed") {
          await applyQueuedMessages(
            targetThreadId,
            waitingQueuedMessages(queuedMessagesRef.current),
          );
          break;
        }
        nextQueuedMessage = await flushNextQueuedMessage();
      }
    },
    [applyQueuedMessages, flushNextQueuedMessage, runQueuedMessage],
  );

  const sendMessage = useCallback(
    async (
      threadId: string,
      message: PromptInputMessage,
      extraContext?: Record<string, unknown>,
    ) => {
      const text = message.text.trim();
      const { queuedFiles, filesForSubmit } = await prepareFilesForMessage(
        threadId,
        message,
      );
      const queuedMessage: PendingQueuedThreadMessage = {
        id: uuid(),
        threadId,
        text,
        status: sendInFlightRef.current ? "queued" : "active",
        createdAt: new Date().toISOString(),
        files: queuedFiles,
        message: {
          ...message,
          text,
          files: [],
        },
        filesForSubmit,
        extraContext,
      };

      if (sendInFlightRef.current) {
        await applyQueuedMessages(threadId, [...queuedMessagesRef.current, queuedMessage]);
        return;
      }

      await applyQueuedMessages(threadId, [queuedMessage]);
      const submitResult = await runQueuedMessage(queuedMessage);

      if (submitResult !== "completed") {
        await applyQueuedMessages(
          threadId,
          waitingQueuedMessages(queuedMessagesRef.current),
        );
        return;
      }
      await drainQueuedMessages(threadId);
    },
    [applyQueuedMessages, drainQueuedMessages, prepareFilesForMessage, runQueuedMessage],
  );

  const stop = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    const activeThreadId = threadIdRef.current;
    const activeQueuedMessageId = activeQueuedMessageIdRef.current;
    if (activeThreadId) {
      try {
        await apiClient.cancelRun(activeThreadId);
      } catch {
        // Best-effort cancellation; local abort already stopped the client stream.
      }
    }
    setIsLoading(false);
    sendInFlightRef.current = false;
    activeQueuedMessageIdRef.current = null;
    if (activeThreadId && activeQueuedMessageId) {
      await applyQueuedMessages(
        activeThreadId,
        waitingQueuedMessages(queuedMessagesRef.current).filter(
          (message) => message.id !== activeQueuedMessageId,
        ),
      );
    }
    if (activeThreadId) {
      await drainQueuedMessages(activeThreadId);
    }
  }, [apiClient, applyQueuedMessages, drainQueuedMessages]);

  const thread: BaseStream<AgentThreadState> = useMemo(
    () => ({
      threadId: onStreamThreadId ?? null,
      messages,
      values: {
        ...values,
        messages,
        queued_messages: queuedMessages.map(serializeQueuedMessage),
      },
      queuedMessages: queuedMessages.map(serializeQueuedMessage),
      error,
      isLoading,
      isThreadLoading,
      stop,
      submit,
      removeQueuedMessage,
      promoteQueuedMessage,
    }),
    [
      error,
      isLoading,
      isThreadLoading,
      messages,
      onStreamThreadId,
      promoteQueuedMessage,
      queuedMessages,
      removeQueuedMessage,
      stop,
      submit,
      values,
    ],
  );

  // Merge thread with optimistic messages for display
  const mergedThread =
    optimisticMessages.length > 0
      ? ({
          ...thread,
          messages: [...thread.messages, ...optimisticMessages],
        } as typeof thread)
      : thread;

  return [mergedThread, sendMessage, isUploading] as const;
}

export function useThreads(
  params: ThreadListSearchParams = {
    limit: 50,
    scope: "general",
    sortBy: "updated_at",
    sortOrder: "desc",
    select: ["thread_id", "updated_at", "values"],
  },
) {
  const apiClient = getAPIClient();
  return useQuery<AgentThread[]>({
    queryKey: ["threads", "search", params],
    queryFn: async () => {
      const maxResults = params.limit;
      const initialOffset = params.offset ?? 0;
      const DEFAULT_PAGE_SIZE = 50;

      // Preserve prior semantics: if a non-positive limit is explicitly provided,
      // delegate to a single search call with the original parameters.
      if (maxResults !== undefined && maxResults <= 0) {
        const response = await apiClient.search<AgentThreadState>(params);
        return response as AgentThread[];
      }

      const pageSize =
        typeof maxResults === "number" && maxResults > 0
          ? Math.min(DEFAULT_PAGE_SIZE, maxResults)
          : DEFAULT_PAGE_SIZE;

      const threads: AgentThread[] = [];
      let offset = initialOffset;

      while (true) {
        if (typeof maxResults === "number" && threads.length >= maxResults) {
          break;
        }

        const currentLimit =
          typeof maxResults === "number"
            ? Math.min(pageSize, maxResults - threads.length)
            : pageSize;

        if (typeof maxResults === "number" && currentLimit <= 0) {
          break;
        }

        const response = (await apiClient.search<AgentThreadState>({
          ...params,
          limit: currentLimit,
          offset,
        })) as AgentThread[];

        threads.push(...response);

        if (response.length < currentLimit) {
          break;
        }

        offset += response.length;
      }

      return threads;
    },
    refetchOnWindowFocus: false,
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  const apiClient = getAPIClient();
  return useMutation({
    mutationFn: async ({ threadId }: { threadId: string }) => {
      await apiClient.deleteThread(threadId);
    },
    onSuccess(_, { threadId }) {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread> | undefined) =>
          removeThreadFromSearchCache(oldData, threadId),
      );
    },
    onSettled() {
      void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
    },
  });
}

export function useDeleteThreads() {
  const queryClient = useQueryClient();
  const apiClient = getAPIClient();
  return useMutation({
    mutationFn: async ({ threadIds }: { threadIds: string[] }) => {
      await Promise.all(threadIds.map((threadId) => apiClient.deleteThread(threadId)));
    },
    onSuccess(_, { threadIds }) {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread> | undefined) =>
          threadIds.reduce(
            (current, threadId) => removeThreadFromSearchCache(current, threadId),
            oldData,
          ),
      );
    },
    onSettled() {
      void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
    },
  });
}

export function useRenameThread() {
  const queryClient = useQueryClient();
  const apiClient = getAPIClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      title,
    }: {
      threadId: string;
      title: string;
    }) => {
      await apiClient.updateState(threadId, {
        values: { title },
      });
    },
    onSuccess(_, { threadId, title }) {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread>) => {
          return oldData.map((t) => {
            if (t.thread_id === threadId) {
              return {
                ...t,
                values: {
                  ...t.values,
                  title,
                },
              };
            }
            return t;
          });
        },
      );
    },
  });
}
