import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

import { getAPIClient } from "../api";
import type { DesktopThreadSearchParams } from "../api/desktop-client";
import { useI18n } from "../i18n/hooks";
import type { FileInMessage } from "../messages/utils";
import { useUpdateSubtask } from "../tasks/context";
import { getThreadRequestErrorCopy, getThreadRequestErrorMessage } from "./error-copy";
import type { UploadedFileInfo } from "../uploads";
import { uploadFiles } from "../uploads";
import { removeThreadFromSearchCache } from "./cache";

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

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  if (incoming.length === 0) {
    return existing;
  }

  const merged = [...existing];
  const indexById = new Map<string, number>();

  for (const [index, message] of merged.entries()) {
    if (message.id) {
      indexById.set(message.id, index);
    }
  }

  for (const message of incoming) {
    if (message.id && indexById.has(message.id)) {
      merged[indexById.get(message.id)!] = message;
      continue;
    }
    if (message.id) {
      indexById.set(message.id, merged.length);
    }
    merged.push(message);
  }

  return merged;
}

export function useThreadStream({
  threadId,
  context,
  isMock,
  onStart,
  onFinish,
  onToolEnd,
}: ThreadStreamOptions) {
  const { t } = useI18n();
  // Track the thread ID that is currently streaming to handle thread changes during streaming
  const [onStreamThreadId, setOnStreamThreadId] = useState(() => threadId);
  // Ref to track current thread ID across async callbacks without causing re-renders,
  // and to allow access to the current thread id in onUpdateEvent
  const threadIdRef = useRef<string | null>(threadId ?? null);
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
      setOnStreamThreadId(normalizedThreadId);
    }
    threadIdRef.current = normalizedThreadId;
  }, [threadId]);

  const _handleOnStart = useCallback((id: string) => {
    if (!startedRef.current) {
      listeners.current.onStart?.(id);
      startedRef.current = true;
    }
  }, []);

  const handleStreamStart = useCallback(
    (_threadId: string) => {
      threadIdRef.current = _threadId;
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

  useEffect(() => {
    const currentThreadId = onStreamThreadId;
    if (!currentThreadId) {
      setMessages([]);
      setValues(EMPTY_THREAD_STATE);
      setError(null);
      setIsThreadLoading(false);
      return;
    }

    let cancelled = false;

    setIsThreadLoading(true);
    void apiClient
      .getState<AgentThreadState>(currentThreadId)
      .then((state) => {
        if (cancelled) {
          return;
        }
        const incomingMessages = state.values?.messages ?? [];
        const mergedMessages = mergeMessages(messagesRef.current, incomingMessages);
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
  }, [apiClient, onStreamThreadId]);

  const stop = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  const submit = useCallback(
    async (payload: ThreadSubmitPayload, options: ThreadSubmitOptions) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setError(null);
      setIsLoading(true);

      try {
        await apiClient.streamRun(options.threadId, payload, options, {
          signal: abortController.signal,
          onCreated: (createdThreadId) => {
            handleStreamStart(createdThreadId);
            setOnStreamThreadId(createdThreadId);
          },
          onEvent: (eventType, eventData) => {
            if (eventType === "messages-tuple") {
              const nextMessage = eventData as Message;
              setMessages((current) => mergeMessages(current, [nextMessage]));
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

            if (eventType === "values") {
              const snapshot = eventData as Partial<AgentThreadState>;
              const snapshotMessages = Array.isArray(snapshot.messages)
                ? (snapshot.messages as Message[])
                : [];
              const mergedMessages = mergeMessages(messagesRef.current, snapshotMessages);
              setMessages(mergedMessages);
              setValues((current) => ({
                ...current,
                ...snapshot,
                messages: mergedMessages,
              }));

              if (snapshot.title) {
                void queryClient.setQueriesData(
                  {
                    queryKey: ["threads", "search"],
                    exact: false,
                  },
                  (oldData: Array<AgentThread> | undefined) =>
                    oldData?.map((thread) =>
                      thread.thread_id === threadIdRef.current
                        ? {
                            ...thread,
                            values: {
                              ...thread.values,
                              title: snapshot.title as string,
                            },
                          }
                        : thread,
                    ),
                );
              }
            }

            if (eventType === "end") {
              listeners.current.onFinish?.({
                ...valuesRef.current,
                messages: messagesRef.current,
              });
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
    [apiClient, handleStreamStart, queryClient, updateSubtask],
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
            // Convert FileUIPart to File objects by fetching blob URLs
            const filePromises = message.files.map(async (fileUIPart) => {
              if (fileUIPart.url && fileUIPart.filename) {
                try {
                  // Fetch the blob URL to get the file data
                  const response = await fetch(fileUIPart.url);
                  const blob = await response.blob();

                  // Create a File object from the blob
                  return new File([blob], fileUIPart.filename, {
                    type: fileUIPart.mediaType || blob.type,
                  });
                } catch (error) {
                  console.error(
                    `Failed to fetch file ${fileUIPart.filename}:`,
                    error,
                  );
                  return null;
                }
              }
              return null;
            });

            const conversionResults = await Promise.all(filePromises);
            const files = conversionResults.filter(
              (file): file is File => file !== null,
            );
            const failedConversions = conversionResults.length - files.length;

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
      }
    },
    [thread, _handleOnStart, t.uploads.uploadingFiles, context, queryClient],
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
  params: DesktopThreadSearchParams = {
    limit: 50,
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
