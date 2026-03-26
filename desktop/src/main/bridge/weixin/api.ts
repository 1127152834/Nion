import crypto from "node:crypto";

import {
  WEIXIN_DEFAULT_BASE_URL,
  WEIXIN_MESSAGE_ITEM_TYPE,
  WEIXIN_MESSAGE_STATE,
  WEIXIN_MESSAGE_TYPE,
  type WeixinCredentials,
  type WeixinGetUpdatesResponse,
  type WeixinQrCodeStartResponse,
  type WeixinQrCodeStatusResponse,
} from "./types.js";

const WEIXIN_CHANNEL_VERSION = "nion-weixin-bridge/1.0";
const WEIXIN_LONG_POLL_TIMEOUT_MS = 35_000;
const WEIXIN_API_TIMEOUT_MS = 15_000;
const WEIXIN_QR_LOGIN_BASE_URL = "https://ilinkai.weixin.qq.com";

function generateWechatUin() {
  return crypto.randomBytes(4).toString("base64");
}

function buildHeaders(creds: WeixinCredentials, routeTag?: string) {
  return {
    "Content-Type": "application/json",
    AuthorizationType: "ilink_bot_token",
    Authorization: `Bearer ${creds.botToken}`,
    "X-WECHAT-UIN": generateWechatUin(),
    ...(routeTag ? { SKRouteTag: routeTag } : {}),
  };
}

async function weixinRequest<T>(
  creds: WeixinCredentials,
  endpoint: string,
  body: unknown,
  timeoutMs = WEIXIN_API_TIMEOUT_MS,
  routeTag?: string,
): Promise<T> {
  const baseUrl = creds.baseUrl || WEIXIN_DEFAULT_BASE_URL;
  const response = await fetch(`${baseUrl}/ilink/bot/${endpoint}`, {
    method: "POST",
    headers: buildHeaders(creds, routeTag),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Weixin API error: HTTP ${response.status}`);
  }

  const rawText = await response.text();
  if (!rawText.trim()) {
    return {} as T;
  }

  return JSON.parse(rawText) as T;
}

export async function getWeixinUpdates(
  creds: WeixinCredentials,
  getUpdatesBuf: string,
) {
  try {
    return await weixinRequest<WeixinGetUpdatesResponse>(
      creds,
      "getupdates",
      {
        get_updates_buf: getUpdatesBuf ?? "",
        base_info: { channel_version: WEIXIN_CHANNEL_VERSION },
      },
      WEIXIN_LONG_POLL_TIMEOUT_MS + 5_000,
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { msgs: [], get_updates_buf: getUpdatesBuf };
    }
    throw error;
  }
}

function generateClientId() {
  return `nion-wx-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

export async function sendWeixinTextMessage(
  creds: WeixinCredentials,
  toUserId: string,
  text: string,
  contextToken: string,
) {
  const clientId = generateClientId();
  await weixinRequest<Record<string, unknown>>(creds, "sendmessage", {
    msg: {
      from_user_id: "",
      to_user_id: toUserId,
      client_id: clientId,
      message_type: WEIXIN_MESSAGE_TYPE.BOT,
      message_state: WEIXIN_MESSAGE_STATE.FINISH,
      item_list: [
        {
          type: WEIXIN_MESSAGE_ITEM_TYPE.TEXT,
          text_item: { text },
        },
      ],
      context_token: contextToken || undefined,
    },
    base_info: { channel_version: WEIXIN_CHANNEL_VERSION },
  });
  return { clientId };
}

export async function startWeixinLoginQr() {
  const response = await fetch(
    `${WEIXIN_QR_LOGIN_BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=3`,
    {
      signal: AbortSignal.timeout(WEIXIN_API_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new Error(`Weixin QR login start failed: HTTP ${response.status}`);
  }
  return (await response.json()) as WeixinQrCodeStartResponse;
}

export async function pollWeixinLoginQrStatus(qrcode: string) {
  const response = await fetch(
    `${WEIXIN_QR_LOGIN_BASE_URL}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`,
    {
      signal: AbortSignal.timeout(40_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Weixin QR status poll failed: HTTP ${response.status}`);
  }
  return (await response.json()) as WeixinQrCodeStatusResponse;
}

export async function downloadWeixinQrImageDataUrl(imageUrl: string) {
  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(WEIXIN_API_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Weixin QR image fetch failed: HTTP ${response.status}`);
  }
  const mimeType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
