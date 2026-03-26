import type { BridgeInboundMessage } from "../base-adapter.js";

export function parseFeishuInboundMessage(eventData: any): BridgeInboundMessage | null {
  const event = eventData?.event ?? eventData;
  const message = event?.message;
  if (!message?.chat_id || !message?.message_id) {
    return null;
  }

  let text = "";
  if (message.message_type === "text") {
    try {
      const content = JSON.parse(message.content || "{}");
      text = content.text || "";
    } catch {
      text = String(message.content || "");
    }
  }

  if (!text.trim()) {
    return null;
  }

  return {
    platform: "feishu",
    chatId: message.chat_id,
    userId: event?.sender?.sender_id?.open_id,
    text: text.trim(),
    messageId: message.message_id,
    timestamp: Number.parseInt(message.create_time, 10) || Date.now(),
  };
}
