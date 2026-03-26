import type * as lark from "@larksuiteoapi/node-sdk";

import type { BridgeOutboundMessage } from "../base-adapter.js";
import {
  buildFeishuCardContent,
  buildFeishuPostContent,
  hasComplexFeishuMarkdown,
  htmlToFeishuMarkdown,
  preprocessFeishuMarkdown,
} from "../markdown/feishu.js";

export async function sendFeishuMessage(
  client: lark.Client,
  message: BridgeOutboundMessage,
) {
  const text =
    message.parseMode === "HTML"
      ? htmlToFeishuMarkdown(message.text)
      : preprocessFeishuMarkdown(message.text);
  const complex = hasComplexFeishuMarkdown(text);
  const resp = await client.im.message.create({
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: message.chatId,
      content: complex ? buildFeishuCardContent(text) : buildFeishuPostContent(text),
      msg_type: complex ? "interactive" : "post",
    },
  });
  return resp?.data?.message_id || "";
}
