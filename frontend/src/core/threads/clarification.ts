import type { Message } from "./types";

export type PendingClarification = {
  toolMessageId?: string;
  toolCallId?: string;
  question: string;
  context?: string;
  clarificationType: string;
  options: string[];
};

type ClarificationPayload = {
  question?: unknown;
  context?: unknown;
  clarification_type?: unknown;
  options?: unknown;
};

function normalizeClarificationPayload(
  message: Message,
): PendingClarification | null {
  if (message.type !== "tool" || message.name !== "ask_clarification") {
    return null;
  }

  const source = message.additional_kwargs?.clarification;
  if (!source || typeof source !== "object") {
    return null;
  }

  const payload = source as ClarificationPayload;
  const options = Array.isArray(payload.options)
    ? payload.options.filter((option): option is string => typeof option === "string")
    : [];

  if (options.length === 0) {
    return null;
  }

  const fallbackQuestion =
    typeof message.content === "string" ? message.content.trim() : "";
  const question =
    typeof payload.question === "string" && payload.question.trim().length > 0
      ? payload.question.trim()
      : fallbackQuestion;

  if (!question) {
    return null;
  }

  const context =
    typeof payload.context === "string" && payload.context.trim().length > 0
      ? payload.context.trim()
      : undefined;
  const clarificationType =
    typeof payload.clarification_type === "string" &&
    payload.clarification_type.trim().length > 0
      ? payload.clarification_type.trim()
      : "missing_info";

  return {
    toolMessageId: message.id,
    toolCallId: message.tool_call_id,
    question,
    clarificationType,
    options,
    ...(context ? { context } : {}),
  };
}

export function derivePendingClarification(
  messages: Message[],
): PendingClarification | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }

    if (message.type === "human") {
      return null;
    }

    const clarification = normalizeClarificationPayload(message);
    if (clarification) {
      return clarification;
    }
  }

  return null;
}
