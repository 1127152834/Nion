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

type PendingQueuedMessage = {
  threadId: string;
  message: PromptInputMessage;
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const valuesRef = useRef(values);
  const messagesRef = useRef(messages);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  useEffect(() => {
    const currentThreadId = onStreamThreadId;
    if (!currentThreadId) {
      setMessages([]);
      setValues(EMPTY_THREAD_STATE);
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
        setValues(nextValues);
        setMessages(mergedMessages);
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

  const stop = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    const activeThreadId = threadIdRef.current;
    if (activeThreadId) {
      try {
        await apiClient.cancelRun(activeThreadId);
      } catch {
        // Best-effort cancellation; local abort already stopped the client stream.
      }
    }
    setIsLoading(false);
  }, [apiClient]);

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
    async (payload: ThreadSubmitPayload, options: ThreadSubmitOptions) => {
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
      } catch (streamError) {
        if (!abortController.signal.aborted) {
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
        }
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

  const thread: BaseStream<AgentThreadState> = useMemo(
    () => ({
      threadId: onStreamThreadId ?? null,
      messages,
      values: {
        ...values,
        messages,
      },
      error,
      isLoading,
      isThreadLoading,
      stop,
      submit,
    }),
    [error, isLoading, isThreadLoading, messages, onStreamThreadId, stop, submit, values],
  );

  // Optimistic messages shown before the server stream responds
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const sendInFlightRef = useRef(false);
  const pendingQueuedMessageRef = useRef<PendingQueuedMessage | null>(null);
  const drainingQueuedMessageRef = useRef(false);
  // Track message count before sending so we know when server has responded
  const prevMsgCountRef = useRef(thread.messages.length);

  // Clear optimistic when server messages arrive (count increases)
  useEffect(() => {
    if (
      optimisticMessages.length > 0 &&
      thread.messages.length > prevMsgCountRef.current
    ) {
      setOptimisticMessages([]);
    }
  }, [thread.messages.length, optimisticMessages.length]);

  const sendMessage = useCallback(
    async (
      threadId: string,
      message: PromptInputMessage,
      extraContext?: Record<string, unknown>,
    ) => {
      if (sendInFlightRef.current) {
        pendingQueuedMessageRef.current = {
          threadId,
          message,
          extraContext,
        };
        if (!drainingQueuedMessageRef.current) {
          drainingQueuedMessageRef.current = true;
          try {
            await stop();
          } finally {
            drainingQueuedMessageRef.current = false;
          }
        }
        return;
      }
      sendInFlightRef.current = true;

      const text = message.text.trim();

      // Capture current count before showing optimistic messages
      prevMsgCountRef.current = thread.messages.length;

      // Build optimistic files list with uploading status
      const optimisticFiles: FileInMessage[] = (message.files ?? []).map(
        (f) => ({
          filename: f.filename ?? "",
          size: 0,
          status: "uploading" as const,
        }),
      );

      // Create optimistic human message (shown immediately)
      const optimisticHumanMsg: Message = {
        type: "human",
        id: `opt-human-${Date.now()}`,
        content: text ? [{ type: "text", text }] : "",
        additional_kwargs:
          optimisticFiles.length > 0 ? { files: optimisticFiles } : {},
      };

      const newOptimistic: Message[] = [optimisticHumanMsg];
      if (optimisticFiles.length > 0) {
        // Mock AI message while files are being uploaded
        newOptimistic.push({
          type: "ai",
          id: `opt-ai-${Date.now()}`,
          content: t.uploads.uploadingFiles,
          additional_kwargs: { element: "task" },
        });
      }
      setOptimisticMessages(newOptimistic);
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread> | undefined) =>
          oldData?.map((threadEntry) =>
            threadEntry.thread_id === threadId
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

      _handleOnStart(threadId);

      let uploadedFileInfo: UploadedFileInfo[] = [];

      try {
        // Upload files first if any
        if (message.files && message.files.length > 0) {
          setIsUploading(true);
          try {
            const { files, missingCount: failedConversions } =
              getFilesForUpload(message.files);

            if (failedConversions > 0) {
              throw new Error(
                `Failed to prepare ${failedConversions} attachment(s) for upload. Please retry.`,
              );
            }

            if (!threadId) {
              throw new Error("Thread is not ready for file upload.");
            }

            if (files.length > 0) {
              const uploadResponse = await uploadFiles(threadId, files);
              uploadedFileInfo = uploadResponse.files;

              // Update optimistic human message with uploaded status + paths
              const uploadedFiles: FileInMessage[] = uploadedFileInfo.map(
                (info) => ({
                  filename: info.filename,
                  size: info.size,
                  path: info.virtual_path,
                  status: "uploaded" as const,
                }),
              );
              setOptimisticMessages((messages) => {
                if (messages.length > 1 && messages[0]) {
                  const humanMessage: Message = messages[0];
                  return [
                    {
                      ...humanMessage,
                      additional_kwargs: { files: uploadedFiles },
                    },
                    ...messages.slice(1),
                  ];
                }
                return messages;
              });
            }
          } catch (error) {
            console.error("Failed to upload files:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to upload files.";
            toast.error(errorMessage);
            setOptimisticMessages([]);
            throw error;
          } finally {
            setIsUploading(false);
          }
        }

        // Build files metadata for submission (included in additional_kwargs)
        const filesForSubmit: FileInMessage[] = uploadedFileInfo.map(
          (info) => ({
            filename: info.filename,
            size: info.size,
            path: info.virtual_path,
            status: "uploaded" as const,
          }),
        );

        const shortcutSelections = message.shortcutSelections;
        const implicitMentions = message.implicitMentions;
        const messageAdditionalKwargs: Record<string, unknown> = {};
        if (filesForSubmit.length > 0) {
          messageAdditionalKwargs.files = filesForSubmit;
        }
        if (shortcutSelections) {
          messageAdditionalKwargs.shortcut_selections = shortcutSelections;
        }
        if (implicitMentions && implicitMentions.length > 0) {
          messageAdditionalKwargs.implicit_mentions = implicitMentions;
        }

        await thread.submit(
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
            threadId: threadId,
            streamSubgraphs: true,
            streamResumable: true,
            config: {
              recursion_limit: 1000,
            },
            context: {
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
              thread_id: threadId,
            },
          },
        );
      } catch (error) {
        setOptimisticMessages([]);
        setIsUploading(false);
        throw error;
      } finally {
        sendInFlightRef.current = false;
        void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
        const pending = pendingQueuedMessageRef.current;
        if (pending) {
          pendingQueuedMessageRef.current = null;
          void sendMessage(
            pending.threadId,
            pending.message,
            pending.extraContext,
          );
        }
      }
    },
    [thread, _handleOnStart, t.uploads.uploadingFiles, context, locale, queryClient, stop],
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
