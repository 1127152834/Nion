import type { AgentThread } from "./types";
import type { Message } from "./types";

export function pathOfThread(threadId: string) {
  return `/workspace/chats/${threadId}`;
}

export function pathOfNewThread() {
  return "/workspace/chats/new";
}

export function textOfMessage(message: Message) {
  if (typeof message.content === "string") {
    return message.content;
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === "text" && "text" in part) {
        return part.text;
      }
    }
  }
  return null;
}

export function titleOfThread(thread: AgentThread) {
  return thread.values?.title ?? "Untitled";
}
