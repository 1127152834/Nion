type ThreadSearchRecord = {
  thread_id: string;
  values?: Record<string, unknown>;
};

type ThreadUploadAttachment = {
  name: string;
  type: string;
  data: string;
};

type ResolveBridgePermissionResult = {
  ok: boolean;
  decision?: "allow" | "allow_session" | "deny";
  original_message_text?: string;
  tool_name?: string;
  message?: string;
};

export type ThreadStreamEvent = {
  event: string;
  data: any;
};

export type ThreadToolEvent =
  | { type: "tool_use"; id: string; name: string }
  | { type: "tool_result"; tool_use_id: string; name?: string; is_error: boolean };

export type ThreadStreamCallbacks = {
  onEvent?: (event: ThreadStreamEvent) => void;
  onText?: (text: string) => void;
  onToolEvent?: (event: ThreadToolEvent) => void;
};

type ThreadStreamResult = {
  threadId: string;
  finalText: string;
  events: ThreadStreamEvent[];
};

type ThreadStreamOptions = {
  modelName?: string;
  planMode?: boolean;
  signal?: AbortSignal;
};

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

function emitToolEvents(parsed: any, callbacks?: ThreadStreamCallbacks) {
  if (!callbacks?.onToolEvent || !parsed || typeof parsed !== "object") {
    return;
  }

  if (parsed.type === "ai" && Array.isArray(parsed.tool_calls)) {
    for (const toolCall of parsed.tool_calls) {
      if (
        toolCall &&
        typeof toolCall === "object" &&
        typeof toolCall.id === "string" &&
        typeof toolCall.name === "string"
      ) {
        callbacks.onToolEvent({
          type: "tool_use",
          id: toolCall.id,
          name: toolCall.name,
        });
      }
    }
    return;
  }

  if (parsed.type === "tool" && typeof parsed.tool_call_id === "string") {
    callbacks.onToolEvent({
      type: "tool_result",
      tool_use_id: parsed.tool_call_id,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      is_error: false,
    });
  }
}

async function consumeSSE(
  response: Response,
  callbacks?: ThreadStreamCallbacks,
): Promise<ThreadStreamResult> {
  if (!response.body) {
    throw new Error("Streaming response body is missing");
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const events: ThreadStreamEvent[] = [];
  let buffer = "";
  let threadId = "";
  let finalText = "";

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
      const parsed = event.data ? JSON.parse(event.data) : {};

      if (event.event === "error") {
        const message =
          (typeof parsed?.message === "string" && parsed.message.trim()) ||
          (typeof parsed?.error === "string" && parsed.error.trim()) ||
          "Thread stream failed";
        throw new Error(message);
      }

      if (event.event === "created" && typeof parsed.thread_id === "string") {
        threadId = parsed.thread_id;
      }

      emitToolEvents(parsed, callbacks);

      if (
        event.event === "messages-tuple" &&
        parsed?.type === "ai" &&
        typeof parsed?.content === "string" &&
        parsed.content
      ) {
        finalText = parsed.content;
        callbacks?.onText?.(parsed.content);
      }

      const nextEvent = { event: event.event, data: parsed };
      callbacks?.onEvent?.(nextEvent);
      events.push(nextEvent);
      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  return {
    threadId,
    finalText,
    events,
  };
}

export function createNionThreadClient(baseUrl: string) {
  const threadsBaseUrl = `${baseUrl.replace(/\/$/, "")}/api/threads`;

  const searchThread = async (threadId: string): Promise<ThreadSearchRecord | null> => {
    const response = await fetch(`${threadsBaseUrl}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thread_id: threadId,
        limit: 1,
        offset: 0,
        select: ["values"],
      }),
    });
    if (!response.ok) {
      throw new Error(`Thread search failed with status ${response.status}`);
    }
    const records = (await response.json()) as ThreadSearchRecord[];
    return records.find((record) => record.thread_id === threadId) ?? null;
  };

  const ensureThreadState = async (
    threadId: string,
    values: Record<string, unknown>,
  ) => {
    const response = await fetch(`${threadsBaseUrl}/${threadId}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    if (!response.ok) {
      throw new Error(`Thread state update failed with status ${response.status}`);
    }
    return response.json();
  };

  const streamMessage = async (
    threadId: string,
    text: string,
    callbacks?: ThreadStreamCallbacks,
    options?: ThreadStreamOptions,
  ): Promise<ThreadStreamResult> => {
    const response = await fetch(`${threadsBaseUrl}/${threadId}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: text }],
        context: {
          surface: "bridge",
          model_name: options?.modelName,
          is_plan_mode: options?.planMode ?? false,
        },
        config: {},
      }),
    });
    if (!response.ok) {
      throw new Error(`Thread stream failed with status ${response.status}`);
    }
    return consumeSSE(response, callbacks);
  };

  const uploadFiles = async (threadId: string, files: ThreadUploadAttachment[]) => {
    const formData = new FormData();
    for (const file of files) {
      const blob = new Blob([Buffer.from(file.data, "base64")], {
        type: file.type || "application/octet-stream",
      });
      formData.append("files", blob, file.name);
    }

    const response = await fetch(`${threadsBaseUrl}/${threadId}/uploads`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Thread upload failed with status ${response.status}`);
    }
    return response.json();
  };

  const resolvePermission = async (
    threadId: string,
    permissionRequestId: string,
    decision: "allow" | "allow_session" | "deny",
  ) => {
    const response = await fetch(
      `${threadsBaseUrl}/${threadId}/bridge/permissions/${permissionRequestId}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      },
    );
    if (!response.ok) {
      throw new Error(`Permission resolution failed with status ${response.status}`);
    }
    return (await response.json()) as ResolveBridgePermissionResult;
  };

  return {
    searchThread,
    ensureThreadState,
    streamMessage,
    uploadFiles,
    resolvePermission,
  };
}
