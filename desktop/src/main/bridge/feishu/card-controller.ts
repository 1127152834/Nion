import type * as lark from "@larksuiteoapi/node-sdk";

export type FeishuCardStreamConfig = {
  throttleMs: number;
  footer?: {
    status: boolean;
    elapsed: boolean;
  };
};

type FeishuToolCallInfo = {
  id: string;
  name: string;
  status: "running" | "complete" | "error";
};

type FeishuCardState = {
  messageId: string;
  cardId: string | null;
  text: string;
  status: "streaming" | "completed" | "interrupted" | "error";
  updatedAt: number;
  sequence: number;
  startTime: number;
  pendingText: string | null;
  throttleTimer: ReturnType<typeof setTimeout> | null;
  toolCalls: FeishuToolCallInfo[];
};

function formatElapsed(ms: number) {
  if (ms < 1_000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1_000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

function buildToolLines(toolCalls: FeishuToolCallInfo[]) {
  return toolCalls
    .map((toolCall) => {
      const icon =
        toolCall.status === "running"
          ? "🔄"
          : toolCall.status === "error"
            ? "❌"
            : "✅";
      return `${icon} \`${toolCall.name}\``;
    })
    .join("\n");
}

function buildStreamingContent(state: FeishuCardState) {
  const toolLines = buildToolLines(state.toolCalls);
  if (toolLines && state.text) {
    return `${state.text}\n\n${toolLines}`;
  }
  return state.text || toolLines || "💭 Thinking...";
}

function buildFinalCard(
  state: FeishuCardState,
  config: FeishuCardStreamConfig,
  finalText: string,
  status: "completed" | "interrupted" | "error",
) {
  const elements: Array<Record<string, unknown>> = [
    {
      tag: "markdown",
      content: finalText || " ",
      text_size: "normal",
      element_id: "streaming_content",
    },
  ];

  const toolLines = buildToolLines(state.toolCalls);
  if (toolLines) {
    elements.push({
      tag: "markdown",
      content: toolLines,
      text_size: "notation",
      element_id: "tool_summary",
    });
  }

  const footerParts: string[] = [];
  if (config.footer?.status) {
    const labels = {
      completed: "✅ Completed",
      interrupted: "⚠️ Interrupted",
      error: "❌ Error",
    };
    footerParts.push(labels[status]);
  }
  if (config.footer?.elapsed) {
    footerParts.push(formatElapsed(Date.now() - state.startTime));
  }

  if (footerParts.length > 0) {
    elements.push({ tag: "hr" });
    elements.push({
      tag: "markdown",
      content: footerParts.join(" · "),
      text_size: "notation",
      element_id: "footer",
    });
  }

  return {
    schema: "2.0",
    config: { wide_screen_mode: true },
    body: { elements },
  };
}

async function flushUpdate(
  state: FeishuCardState,
  client: lark.Client | null | undefined,
): Promise<"ok" | "fail"> {
  const cardkit = (client as any)?.cardkit?.v2?.card;
  if (!state.cardId || !cardkit?.streamContent) {
    state.pendingText = null;
    state.updatedAt = Date.now();
    return "ok";
  }

  try {
    state.sequence += 1;
    await cardkit.streamContent({
      path: { card_id: state.cardId },
      data: {
        content: buildStreamingContent(state),
        sequence: state.sequence,
      },
    });
    state.pendingText = null;
    state.updatedAt = Date.now();
    return "ok";
  } catch {
    return "fail";
  }
}

export type FeishuCardStreamController = ReturnType<typeof createFeishuCardStreamController>;

export function createFeishuCardStreamController(
  config: FeishuCardStreamConfig,
  client?: lark.Client | null,
) {
  const cards = new Map<string, FeishuCardState>();
  const throttleMs = config.throttleMs;

  return {
    create: async (chatId: string, initialText: string, replyToMessageId?: string) => {
      const cardkit = (client as any)?.cardkit?.v2?.card;
      const messageApi = (client as any)?.im?.message;

      let cardId: string | null = null;
      let messageId = `${chatId}:${Date.now()}`;

      if (cardkit?.create && messageApi?.create) {
        try {
          const cardBody = {
            schema: "2.0",
            config: {
              streaming_mode: true,
              wide_screen_mode: true,
              summary: { content: "思考中..." },
            },
            body: {
              elements: [
                {
                  tag: "markdown",
                  content: initialText || "💭 Thinking...",
                  text_align: "left",
                  text_size: "normal",
                  element_id: "streaming_content",
                },
              ],
            },
          };

          const createResponse = await cardkit.create({
            data: {
              type: "card_json",
              data: JSON.stringify(cardBody),
            },
          });
          cardId = createResponse?.data?.card_id || null;

          if (cardId) {
            const content = JSON.stringify({ type: "card", data: { card_id: cardId } });
            const messageResponse = replyToMessageId && messageApi.reply
              ? await messageApi.reply({
                  path: { message_id: replyToMessageId },
                  data: {
                    content,
                    msg_type: "interactive",
                  },
                })
              : await messageApi.create({
                  params: { receive_id_type: "chat_id" },
                  data: {
                    receive_id: chatId,
                    content,
                    msg_type: "interactive",
                  },
                });
            messageId = messageResponse?.data?.message_id || messageId;
          }
        } catch {
          cardId = null;
        }
      }

      cards.set(messageId, {
        messageId,
        cardId,
        text: initialText,
        status: "streaming",
        updatedAt: Date.now(),
        sequence: 0,
        startTime: Date.now(),
        pendingText: initialText,
        throttleTimer: null,
        toolCalls: [],
      });

      return messageId;
    },
    update: async (messageId: string, text: string) => {
      const state = cards.get(messageId);
      if (!state) {
        return "fail" as const;
      }

      state.text = text;
      state.pendingText = text;

      const elapsed = Date.now() - state.updatedAt;
      if (elapsed < throttleMs) {
        if (!state.throttleTimer) {
          state.throttleTimer = setTimeout(() => {
            state.throttleTimer = null;
            void flushUpdate(state, client);
          }, throttleMs - elapsed);
        }
        return "ok" as const;
      }

      return flushUpdate(state, client);
    },
    updateToolCalls: (messageId: string, toolCalls: FeishuToolCallInfo[]) => {
      const state = cards.get(messageId);
      if (!state) {
        return;
      }
      state.toolCalls = toolCalls;
      if (!state.throttleTimer) {
        state.throttleTimer = setTimeout(() => {
          state.throttleTimer = null;
          void flushUpdate(state, client);
        }, throttleMs);
      }
    },
    finalize: async (
      messageId: string,
      finalText: string,
      status: "completed" | "interrupted" | "error" = "completed",
    ) => {
      const state = cards.get(messageId);
      if (!state) {
        return;
      }

      if (state.throttleTimer) {
        clearTimeout(state.throttleTimer);
        state.throttleTimer = null;
      }

      state.text = finalText;
      state.status = status;
      state.updatedAt = Date.now();

      const cardkit = (client as any)?.cardkit?.v2?.card;
      if (state.cardId && cardkit?.update) {
        try {
          if (cardkit.setStreamingMode) {
            state.sequence += 1;
            await cardkit.setStreamingMode({
              path: { card_id: state.cardId },
              data: {
                streaming_mode: false,
                sequence: state.sequence,
              },
            });
          }

          state.sequence += 1;
          await cardkit.update({
            path: { card_id: state.cardId },
            data: {
              type: "card_json",
              data: JSON.stringify(buildFinalCard(state, config, finalText, status)),
              sequence: state.sequence,
            },
          });
        } catch {
          // Best effort: keep in-memory state so callers still complete gracefully.
        }
      }

      cards.set(messageId, state);
    },
  };
}
