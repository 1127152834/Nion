import type { Message, PendingPermissionRequest } from "./types";

type PermissionRequestPayload = {
  id?: unknown;
  tool_name?: unknown;
  tool_input?: unknown;
  actions?: unknown;
  options?: unknown;
  reason_code?: unknown;
  reason_message?: unknown;
  review_title?: unknown;
  review_summary?: unknown;
};

function normalizePermissionRequestPayload(
  message: Message,
): PendingPermissionRequest | null {
  if (message.type !== "tool" || message.name !== "permission_request") {
    return null;
  }

  const source = message.additional_kwargs?.permission_request;
  if (!source || typeof source !== "object") {
    return null;
  }

  const payload = source as PermissionRequestPayload;
  const requestId =
    typeof payload.id === "string" && payload.id.trim().length > 0
      ? payload.id.trim()
      : "";
  const toolName =
    typeof payload.tool_name === "string" && payload.tool_name.trim().length > 0
      ? payload.tool_name.trim()
      : "";
  const toolInput =
    payload.tool_input && typeof payload.tool_input === "object"
      ? (payload.tool_input as Record<string, unknown>)
      : {};
  const actions = Array.isArray(payload.actions)
    ? payload.actions.filter(
        (
          action,
        ): action is {
          key: "allow" | "allow_session" | "deny";
          label: string;
        } =>
          typeof action === "object" &&
          action !== null &&
          "key" in action &&
          "label" in action &&
          (action.key === "allow" ||
            action.key === "allow_session" ||
            action.key === "deny") &&
          typeof action.label === "string",
      )
    : [];
  const options = Array.isArray(payload.options)
    ? payload.options.filter((option): option is string => typeof option === "string")
    : [];

  if (!requestId || !toolName || (actions.length === 0 && options.length === 0)) {
    return null;
  }

  const reasonCode =
    typeof payload.reason_code === "string" && payload.reason_code.trim().length > 0
      ? payload.reason_code.trim()
      : undefined;
  const reasonMessage =
    typeof payload.reason_message === "string" && payload.reason_message.trim().length > 0
      ? payload.reason_message.trim()
      : undefined;
  const reviewTitle =
    toolName === "local_actions_review" &&
    typeof payload.review_title === "string" &&
    payload.review_title.trim().length > 0
      ? payload.review_title.trim()
      : undefined;
  const reviewSummary =
    toolName === "local_actions_review" &&
    typeof payload.review_summary === "string" &&
    payload.review_summary.trim().length > 0
      ? payload.review_summary.trim()
      : undefined;

  return {
    toolMessageId: message.id,
    toolCallId: message.tool_call_id,
    requestId,
    toolName,
    toolInput,
    actions:
      actions.length > 0
        ? actions
        : options.map((option) => ({
            key:
              option === "Allow Session"
                ? "allow_session"
                : option === "Deny"
                  ? "deny"
                  : "allow",
            label: option,
          })),
    options,
    ...(reasonCode ? { reasonCode } : {}),
    ...(reasonMessage ? { reasonMessage } : {}),
    ...(reviewTitle ? { reviewTitle } : {}),
    ...(reviewSummary ? { reviewSummary } : {}),
  };
}

export function derivePendingPermissionRequest(
  messages: Message[],
): PendingPermissionRequest | null {
  let latestPermissionRequest: PendingPermissionRequest | null = null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }

    if (message.type === "human") {
      continue;
    }

    const permissionRequest = normalizePermissionRequestPayload(message);
    if (permissionRequest) {
      latestPermissionRequest = permissionRequest;
      break;
    }
  }

  return latestPermissionRequest;
}
