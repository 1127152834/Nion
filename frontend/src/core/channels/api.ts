import { getBackendBaseURL } from "@/core/config";

import type {
  ChannelAuthorizedUser,
  ChannelAuthorizedUserRevokePayload,
  ChannelAuthorizedUserRevokeResult,
  ChannelAuthorizedUserSessionOverridePayload,
  ChannelConfig,
  ChannelConfigUpsertPayload,
  ChannelConnectionTestPayload,
  ChannelConnectionTestResult,
  ChannelPlatform,
  ChannelPairingCode,
  ChannelPairRequest,
  ChannelPairRequestDecisionPayload,
  ChannelRuntimeStatus,
} from "./types";

async function parseError(response: Response, fallback: string): Promise<string> {
  const statusLabel = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  const detail = await response.text();
  if (!detail) {
    return `${fallback}: ${statusLabel}`;
  }
  try {
    const parsed = JSON.parse(detail) as { detail?: unknown };
    if (parsed && typeof parsed === "object" && parsed.detail !== undefined) {
      if (typeof parsed.detail === "string") {
        return `${statusLabel}: ${parsed.detail}`;
      }
      return `${statusLabel}: ${JSON.stringify(parsed.detail)}`;
    }
  } catch {
    // ignore non-json
  }
  return `${statusLabel}: ${detail}`;
}

async function requestJSON<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback = "Request failed",
): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await parseError(response, fallback));
  }
  return (await response.json()) as T;
}

export function getChannelConfig(platform: ChannelPlatform) {
  return requestJSON<ChannelConfig>(
    `${getBackendBaseURL()}/api/channels/${platform}/config`,
    undefined,
    "Failed to load channel config",
  );
}

export function upsertChannelConfig(
  platform: ChannelPlatform,
  payload: ChannelConfigUpsertPayload,
) {
  return requestJSON<ChannelConfig>(
    `${getBackendBaseURL()}/api/channels/${platform}/config`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to save channel config",
  );
}

export function testChannelConnection(
  platform: ChannelPlatform,
  payload: ChannelConnectionTestPayload,
) {
  return requestJSON<ChannelConnectionTestResult>(
    `${getBackendBaseURL()}/api/channels/${platform}/test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to test channel connection",
  );
}

export function getChannelRuntimeStatus(platform: ChannelPlatform) {
  return requestJSON<ChannelRuntimeStatus>(
    `${getBackendBaseURL()}/api/channels/${platform}/runtime`,
    undefined,
    "Failed to load channel runtime status",
  );
}

export function createPairingCode(platform: ChannelPlatform, ttlMinutes = 10) {
  return requestJSON<ChannelPairingCode>(
    `${getBackendBaseURL()}/api/channels/${platform}/pairing-code`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttl_minutes: ttlMinutes }),
    },
    "Failed to create pairing code",
  );
}

export function listPairRequests(
  platform: ChannelPlatform,
  status?: "pending" | "approved" | "rejected",
) {
  const search = new URLSearchParams();
  if (status) {
    search.set("status", status);
  }
  const query = search.toString();
  return requestJSON<ChannelPairRequest[]>(
    `${getBackendBaseURL()}/api/channels/${platform}/pair-requests${query ? `?${query}` : ""}`,
    undefined,
    "Failed to load pair requests",
  );
}

export function approvePairRequest(
  platform: ChannelPlatform,
  requestId: number,
  payload: ChannelPairRequestDecisionPayload,
) {
  return requestJSON<ChannelPairRequest>(
    `${getBackendBaseURL()}/api/channels/${platform}/pair-requests/${requestId}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to approve pair request",
  );
}

export function rejectPairRequest(
  platform: ChannelPlatform,
  requestId: number,
  payload: ChannelPairRequestDecisionPayload,
) {
  return requestJSON<ChannelPairRequest>(
    `${getBackendBaseURL()}/api/channels/${platform}/pair-requests/${requestId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to reject pair request",
  );
}

export function listAuthorizedUsers(platform: ChannelPlatform, activeOnly = true) {
  const search = new URLSearchParams();
  search.set("active_only", activeOnly ? "true" : "false");
  return requestJSON<ChannelAuthorizedUser[]>(
    `${getBackendBaseURL()}/api/channels/${platform}/authorized-users?${search.toString()}`,
    undefined,
    "Failed to load authorized users",
  );
}

export function revokeAuthorizedUser(
  platform: ChannelPlatform,
  userId: number,
  payload: ChannelAuthorizedUserRevokePayload,
) {
  return requestJSON<ChannelAuthorizedUserRevokeResult>(
    `${getBackendBaseURL()}/api/channels/${platform}/authorized-users/${userId}/revoke`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to revoke authorized user",
  );
}

export function updateAuthorizedUserSessionOverride(
  platform: ChannelPlatform,
  userId: number,
  payload: ChannelAuthorizedUserSessionOverridePayload,
) {
  return requestJSON<ChannelAuthorizedUser>(
    `${getBackendBaseURL()}/api/channels/${platform}/authorized-users/${userId}/session-override`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to update authorized user session override",
  );
}
