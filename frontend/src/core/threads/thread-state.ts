import type { Message } from "./types";

export function mergeThreadMessages(
  existingMessages: Message[],
  incomingMessages: Message[],
): Message[] {
  if (incomingMessages.length === 0) {
    return existingMessages;
  }

  const merged = [...existingMessages];
  const indexById = new Map<string, number>();

  for (const [index, message] of merged.entries()) {
    if (message.id) {
      indexById.set(message.id, index);
    }
  }

  for (const message of incomingMessages) {
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

export function reconcileLoadedThreadMessages({
  currentStateThreadId,
  loadedThreadId,
  existingMessages,
  incomingMessages,
}: {
  currentStateThreadId: string | null;
  loadedThreadId: string;
  existingMessages: Message[];
  incomingMessages: Message[];
}): Message[] {
  if (currentStateThreadId !== loadedThreadId) {
    return incomingMessages;
  }

  return mergeThreadMessages(existingMessages, incomingMessages);
}
