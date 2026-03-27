import type { AgentThread } from "./types";
import type { Message } from "./types";
import { isInternalSummaryMessage } from "../messages/utils";
export {
  pathOfAgentThread,
  pathOfNewAgentThread,
  pathOfNewThread,
  pathOfThread,
} from "../navigation/desktop-routes";

export function textOfMessage(message: Message) {
  if (isInternalSummaryMessage(message)) {
    return null;
  }
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

export function bridgeInfoOfThread(thread: AgentThread) {
  const bridge = thread.values?.bridge;
  if (!bridge || bridge.source !== "bridge" || !bridge.platform) {
    return null;
  }
  return bridge;
}
