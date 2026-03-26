import {
  downloadWeixinQrImageDataUrl,
  pollWeixinLoginQrStatus,
  startWeixinLoginQr,
} from "./api.js";
import {
  WEIXIN_DEFAULT_BASE_URL,
  WEIXIN_DEFAULT_CDN_BASE_URL,
} from "./types.js";
import type { WeixinBridgeAccount } from "../weixin-store.js";

export type WeixinQrLoginSession = {
  sessionId: string;
  qrcode: string;
  qrImage: string;
  startedAt: number;
  refreshCount: number;
  status: "waiting" | "scanned" | "confirmed" | "expired" | "failed";
  accountId?: string;
  error?: string;
};

export function createWeixinAuthManager(options: {
  upsertAccount: (input: {
    accountId: string;
    userId: string;
    baseUrl: string;
    cdnBaseUrl: string;
    token: string;
    name?: string;
    enabled?: boolean;
  }) => WeixinBridgeAccount;
}) {
  const sessions = new Map<string, WeixinQrLoginSession>();

  const startLogin = async () => {
    const response = await startWeixinLoginQr();
    if (!response.qrcode || !response.qrcode_img_content) {
      throw new Error("Weixin QR code is unavailable");
    }

    const sessionId = `wx-login-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const qrImage = response.qrcode_img_content.startsWith("data:")
      ? response.qrcode_img_content
      : await downloadWeixinQrImageDataUrl(response.qrcode_img_content);

    const session: WeixinQrLoginSession = {
      sessionId,
      qrcode: response.qrcode,
      qrImage,
      startedAt: Date.now(),
      refreshCount: 0,
      status: "waiting",
    };

    sessions.set(sessionId, session);
    setTimeout(() => {
      sessions.delete(sessionId);
    }, 10 * 60_000);

    return session;
  };

  const waitForLogin = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        qrcode: "",
        qrImage: "",
        startedAt: 0,
        refreshCount: 0,
        status: "failed" as const,
        error: "Session not found",
      };
    }

    if (session.status === "confirmed" || session.status === "failed") {
      return session;
    }

    const status = await pollWeixinLoginQrStatus(session.qrcode);
    switch (status.status) {
      case "wait":
        session.status = "waiting";
        break;
      case "scaned":
        session.status = "scanned";
        break;
      case "expired":
        session.status = "expired";
        break;
      case "confirmed": {
        session.status = "confirmed";
        if (status.bot_token && status.ilink_bot_id) {
          const accountId = status.ilink_bot_id.replace(/[@.]/g, "-");
          session.accountId = accountId;
          options.upsertAccount({
            accountId,
            userId: status.ilink_user_id || "",
            baseUrl: status.baseurl || WEIXIN_DEFAULT_BASE_URL,
            cdnBaseUrl: WEIXIN_DEFAULT_CDN_BASE_URL,
            token: status.bot_token,
            name: accountId,
            enabled: true,
          });
        }
        break;
      }
      default:
        break;
    }

    return session;
  };

  return {
    startLogin,
    waitForLogin,
  };
}
