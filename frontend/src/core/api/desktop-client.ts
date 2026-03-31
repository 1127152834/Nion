"use client";

import type {
  AgentThreadState,
  PermissionReplayPayload,
  ThreadSubmitOptions,
  ThreadSubmitPayload,
} from "../threads/types";

export type DesktopThreadSearchParams = {
  limit?: number;
  offset?: number;
  sortBy?: "updated_at" | "created_at";
  sortOrder?: "asc" | "desc";
  select?: string[];
};

type StreamHandlers = {
  signal?: AbortSignal;
  onCreated?: (threadId: string) => void;
  onEvent?: (event: string, data: Record<string, unknown>) => void;
};

export type PermissionResolution = {
  ok: boolean;
  decision?: "allow" | "allow_session" | "deny";
  consumed?: boolean;
  original_message_text?: string;
  replay_payload?: PermissionReplayPayload;
  tool_name?: string;
};

export type DesktopThreadRecord<TState extends Record<string, unknown> = AgentThreadState> = {
  thread_id: string;
  created_at?: string;
  updated_at?: string;
  values: TState;
};

export type NotebookAssistantSessionBootstrapRecord<
  TState extends Record<string, unknown> = AgentThreadState,
> = DesktopThreadRecord<TState> & {
  agent_name?: string;
  deleted?: boolean;
  created: boolean;
};

export type DesktopThreadClient = {
  search<TState extends Record<string, unknown> = AgentThreadState>(
    params: DesktopThreadSearchParams,
  ): Promise<Array<DesktopThreadRecord<TState>>>;
  getState<TState extends Record<string, unknown> = AgentThreadState>(
    threadId: string,
  ): Promise<DesktopThreadRecord<TState>>;
  updateState(
    threadId: string,
    payload: { values: Record<string, unknown> },
  ): Promise<DesktopThreadRecord>;
  deleteThread(threadId: string): Promise<void>;
  streamRun(
    threadId: string,
    payload: ThreadSubmitPayload,
    options: ThreadSubmitOptions,
    handlers?: StreamHandlers,
  ): Promise<void>;
  resolvePermission(
    threadId: string,
    permissionRequestId: string,
    decision: "allow" | "allow_session" | "deny",
  ): Promise<PermissionResolution>;
  createOrResumeNotebookAssistantSession<
    TState extends Record<string, unknown> = AgentThreadState,
  >(
    payload: {
      note_id: string;
      session_id: string;
    },
  ): Promise<NotebookAssistantSessionBootstrapRecord<TState>>;
};

function getDesktopBackendBaseURL(): string {
  if (
    typeof window !== "undefined" &&
    typeof (window as Window & { __NION_BACKEND_BASE_URL__?: string })
      .__NION_BACKEND_BASE_URL__ === "string" &&
    (window as Window & { __NION_BACKEND_BASE_URL__?: string })
      .__NION_BACKEND_BASE_URL__!.length > 0
  ) {
    return (window as Window & { __NION_BACKEND_BASE_URL__?: string })
      .__NION_BACKEND_BASE_URL__!;
  }

  if (
    typeof window !== "undefined" &&
    typeof (window as Window & {
      nionDesktop?: {
        backendBaseUrl?: string;
      };
    }).nionDesktop?.backendBaseUrl === "string" &&
    (window as Window & {
      nionDesktop?: {
        backendBaseUrl?: string;
      };
    }).nionDesktop!.backendBaseUrl!.length > 0
  ) {
    return (window as Window & {
      nionDesktop?: {
        backendBaseUrl?: string;
      };
    }).nionDesktop!.backendBaseUrl!;
  }

  if (
    typeof process !== "undefined" &&
    typeof process.env?.NEXT_PUBLIC_BACKEND_BASE_URL === "string" &&
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL.length > 0
  ) {
    return process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  }

  return "";
}

let runtimeInfoBaseUrlPromise: Promise<string> | null = null;

async function getDesktopBackendBaseURLAsync(): Promise<string> {
  const configured = getDesktopBackendBaseURL();
  if (configured) {
    return configured;
  }

  const desktopBridge =
    typeof window !== "undefined"
      ? (window as Window & {
          nionDesktop?: {
            getRuntimeInfo: () => Promise<{ baseUrl?: string | null }>;
          };
        }).nionDesktop
      : undefined;

  if (desktopBridge?.getRuntimeInfo) {
    runtimeInfoBaseUrlPromise ??= desktopBridge
      .getRuntimeInfo()
      .then((runtimeInfo) => runtimeInfo.baseUrl ?? "");
    return runtimeInfoBaseUrlPromise;
  }

  return "";
}

let runtimeInfoClientIdPromise: Promise<string> | null = null;

async function getDesktopClientIdAsync(): Promise<string> {
  const desktopBridge =
    typeof window !== "undefined"
      ? (window as Window & {
          nionDesktop?: {
            getRuntimeInfo: () => Promise<{ clientId?: string | null }>;
          };
        }).nionDesktop
      : undefined;

  if (desktopBridge?.getRuntimeInfo) {
    runtimeInfoClientIdPromise ??= desktopBridge
      .getRuntimeInfo()
      .then((runtimeInfo) => runtimeInfo.clientId ?? "");
    return runtimeInfoClientIdPromise;
  }

  return "";
}

function getThreadsBaseURL(isMock?: boolean): string {
  if (isMock) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/mock/api/threads`;
    }
    return "http://localhost:3000/mock/api/threads";
  }

  const backendBaseUrl = getDesktopBackendBaseURL();
  return backendBaseUrl ? `${backendBaseUrl}/api/threads` : "/api/threads";
}

async function resolveThreadsBaseURL(
  isMock: boolean,
  getBaseURL: ((isMock?: boolean) => string | Promise<string>) | undefined,
): Promise<string> {
  if (getBaseURL) {
    return await getBaseURL(isMock);
  }

  if (isMock) {
    return getThreadsBaseURL(true);
  }

  const backendBaseUrl = await getDesktopBackendBaseURLAsync();
  return backendBaseUrl ? `${backendBaseUrl}/api/threads` : "/api/threads";
}

async function requestJSON<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeThreadRecord<TState extends Record<string, unknown>>(
  record: Partial<DesktopThreadRecord<TState>> & Record<string, unknown>,
  threadId?: string,
): DesktopThreadRecord<TState> {
  const values = (record.values ?? {}) as TState;
  const resolvedThreadId =
    typeof record.thread_id === "string" ? record.thread_id : (threadId ?? "");
  const createdAt =
    typeof record.created_at === "string" ? record.created_at : undefined;
  const updatedAt =
    typeof record.updated_at === "string" ? record.updated_at : undefined;

  return {
    thread_id: resolvedThreadId,
    created_at: createdAt,
    updated_at: updatedAt,
    values,
  };
}

function parseSSEEvent(part: string): { event: string; data: string } {
  const lines = part.split("\n");
  const event = lines
    .find((line) => line.startsWith("event:"))
    ?.slice("event:".length)
    .trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n");

  return {
    event: event ?? "message",
    data,
  };
}

async function consumeSSE(
  response: Response,
  handlers: StreamHandlers | undefined,
): Promise<void> {
  if (!response.body) {
    throw new Error("Streaming response body is missing");
  }

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += value;
    let separatorIndex = buffer.indexOf("\n\n");

    while (separatorIndex !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex).trim();
      buffer = buffer.slice(separatorIndex + 2);

      if (!rawEvent) {
        separatorIndex = buffer.indexOf("\n\n");
        continue;
      }

      const event = parseSSEEvent(rawEvent);
      const parsed = event.data
        ? (JSON.parse(event.data) as Record<string, unknown>)
        : {};
      if (event.event === "error") {
        const message =
          (typeof parsed.message === "string" ? parsed.message.trim() : undefined) ??
          (typeof parsed.error === "string" ? parsed.error.trim() : undefined) ??
          "Thread stream failed";
        throw new Error(message);
      }
      if (event.event === "created" && typeof parsed.thread_id === "string") {
        handlers?.onCreated?.(parsed.thread_id);
      }
      handlers?.onEvent?.(event.event, parsed);

      separatorIndex = buffer.indexOf("\n\n");
    }
  }
}

async function getMockState<TState extends Record<string, unknown>>(
  threadId: string,
): Promise<DesktopThreadRecord<TState>> {
  const baseUrl = getThreadsBaseURL(true);
  const data = await requestJSON<unknown>(`${baseUrl}/${threadId}/history`, {
    method: "POST",
  });
  const emptyRecord: Record<string, unknown> = {};

  if (Array.isArray(data)) {
    const firstRecord =
      typeof data[0] === "object" && data[0] !== null
        ? (data[0] as Record<string, unknown>)
        : emptyRecord;
    return normalizeThreadRecord<TState>(firstRecord, threadId);
  }

  const record =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : emptyRecord;
  return normalizeThreadRecord<TState>(record, threadId);
}

export function createDesktopThreadClient(
  options:
    | {
        getBaseURL?: (isMock?: boolean) => string | Promise<string>;
        isMock?: boolean;
      }
    | undefined = undefined,
): DesktopThreadClient {
  const isMock = options?.isMock ?? false;
  return {
    async search<TState extends Record<string, unknown> = AgentThreadState>(
      params: DesktopThreadSearchParams,
    ) {
      const baseUrl = await resolveThreadsBaseURL(isMock, options?.getBaseURL);
      const result = await requestJSON<Array<Record<string, unknown>>>(
        `${baseUrl}/search`,
        {
          method: "POST",
          body: JSON.stringify(params),
        },
      );

      return result.map((item) => normalizeThreadRecord<TState>(item));
    },

    async getState<TState extends Record<string, unknown> = AgentThreadState>(
      threadId: string,
    ) {
      if (isMock) {
        return getMockState<TState>(threadId);
      }

      const baseUrl = await resolveThreadsBaseURL(false, options?.getBaseURL);
      const result = await requestJSON<Record<string, unknown>>(
        `${baseUrl}/${threadId}/state`,
      );
      return normalizeThreadRecord<TState>(result, threadId);
    },

    async updateState(threadId: string, payload: { values: Record<string, unknown> }) {
      const baseUrl = await resolveThreadsBaseURL(false, options?.getBaseURL);
      const result = await requestJSON<Record<string, unknown>>(
        `${baseUrl}/${threadId}/state`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      return normalizeThreadRecord(result, threadId);
    },

    async deleteThread(threadId: string) {
      const baseUrl = await resolveThreadsBaseURL(false, options?.getBaseURL);
      const response = await fetch(`${baseUrl}/${threadId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }
    },

    async streamRun(
      threadId: string,
      payload: ThreadSubmitPayload,
      submitOptions: ThreadSubmitOptions,
      handlers?: StreamHandlers,
    ) {
      const baseUrl = await resolveThreadsBaseURL(false, options?.getBaseURL);
      const response = await fetch(`${baseUrl}/${threadId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          context: submitOptions.context ?? {},
          config: submitOptions.config ?? {},
        }),
        signal: handlers?.signal,
      });

      if (!response.ok) {
        throw new Error(`Stream failed with status ${response.status}`);
      }

      await consumeSSE(response, handlers);
    },

    async resolvePermission(
      threadId: string,
      permissionRequestId: string,
      decision: "allow" | "allow_session" | "deny",
    ) {
      const baseUrl = await resolveThreadsBaseURL(false, options?.getBaseURL);
      const clientId = await getDesktopClientIdAsync();
      return requestJSON<PermissionResolution>(
        `${baseUrl}/${threadId}/permissions/${permissionRequestId}/resolve`,
        {
          method: "POST",
          headers: clientId ? { "X-Nion-Client-Id": clientId } : undefined,
          body: JSON.stringify({ decision }),
        },
      );
    },

    async createOrResumeNotebookAssistantSession<
      TState extends Record<string, unknown> = AgentThreadState,
    >(payload: { note_id: string; session_id: string }) {
      const baseUrl = await resolveThreadsBaseURL(false, options?.getBaseURL);
      const result = await requestJSON<Record<string, unknown>>(
        `${baseUrl}/notebook-assistant/session`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      const normalized = normalizeThreadRecord<TState>(result);
      return {
        ...normalized,
        agent_name:
          typeof result.agent_name === "string" ? result.agent_name : undefined,
        deleted: typeof result.deleted === "boolean" ? result.deleted : undefined,
        created: result.created === true,
      };
    },
  };
}
