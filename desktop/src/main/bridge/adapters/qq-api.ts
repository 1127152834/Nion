type AccessTokenResponse = {
  access_token?: string;
  expires_in?: number;
  message?: string;
};

type TokenState = {
  token: string;
  expiresAt: number;
};

let tokenState: TokenState | null = null;
const msgSeqCounters = new Map<string, number>();

export const QQ_GATEWAY_OP = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const;

export const QQ_GATEWAY_INTENTS = {
  PUBLIC_MESSAGES: 1 << 25,
} as const;

export type QQGatewayPayload = {
  op: number;
  d?: unknown;
  s?: number;
  t?: string;
};

export async function getQqAccessToken(appId: string, clientSecret: string): Promise<string> {
  if (tokenState && Date.now() < tokenState.expiresAt - 60_000) {
    return tokenState.token;
  }

  const response = await fetch("https://bots.qq.com/app/getAppAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId, clientSecret }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await response.json()) as AccessTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.message || `QQ token request failed: HTTP ${response.status}`);
  }

  tokenState = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in || 0) * 1_000,
  };
  return payload.access_token;
}

export function clearQqTokenCache() {
  tokenState = null;
}

export async function getQqGatewayUrl(accessToken: string): Promise<string> {
  const response = await fetch("https://api.sgroup.qq.com/gateway", {
    headers: { Authorization: `QQBot ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await response.json()) as { url?: string; message?: string };

  if (!response.ok || !payload.url) {
    throw new Error(payload.message || `QQ gateway request failed: HTTP ${response.status}`);
  }

  return payload.url;
}

export function buildQqIdentify(accessToken: string, intents: number): QQGatewayPayload {
  return {
    op: QQ_GATEWAY_OP.IDENTIFY,
    d: {
      token: `QQBot ${accessToken}`,
      intents,
      shard: [0, 1],
    },
  };
}

export function buildQqResume(
  accessToken: string,
  sessionId: string,
  sequence: number,
): QQGatewayPayload {
  return {
    op: QQ_GATEWAY_OP.RESUME,
    d: {
      token: `QQBot ${accessToken}`,
      session_id: sessionId,
      seq: sequence,
    },
  };
}

export function buildQqHeartbeat(sequence: number | null): QQGatewayPayload {
  return {
    op: QQ_GATEWAY_OP.HEARTBEAT,
    d: sequence,
  };
}

export function nextQqMessageSequence(inboundMessageId: string): number {
  const next = (msgSeqCounters.get(inboundMessageId) || 0) + 1;
  msgSeqCounters.set(inboundMessageId, next);
  if (msgSeqCounters.size > 500) {
    const staleKeys = [...msgSeqCounters.keys()].slice(0, msgSeqCounters.size - 500);
    for (const key of staleKeys) {
      msgSeqCounters.delete(key);
    }
  }
  return next;
}

export async function sendQqPrivateMessage(options: {
  accessToken: string;
  openid: string;
  content: string;
  msgId: string;
  msgSeq: number;
}) {
  const response = await fetch(
    `https://api.sgroup.qq.com/v2/users/${options.openid}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `QQBot ${options.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: options.content,
        msg_type: 0,
        msg_id: options.msgId,
        msg_seq: options.msgSeq,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`QQ send failed: HTTP ${response.status} ${message}`.trim());
  }

  return (await response.json().catch(() => ({}))) as { id?: string };
}
