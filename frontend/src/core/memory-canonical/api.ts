import { getBackendBaseURL } from "../config/index.ts";

import type {
  MemoryFactsSurface,
  MemoryHistorySurface,
  MemoryUserSurface,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isContextSection(value: unknown): value is { summary: string; updatedAt: string } {
  return isRecord(value) && typeof value.summary === "string" && typeof value.updatedAt === "string";
}

function isUserSurface(value: unknown): value is MemoryUserSurface {
  return (
    isRecord(value) &&
    isContextSection(value.workContext) &&
    isContextSection(value.personalContext) &&
    isContextSection(value.topOfMind)
  );
}

function isHistorySurface(value: unknown): value is MemoryHistorySurface {
  return (
    isRecord(value) &&
    isContextSection(value.recentMonths) &&
    isContextSection(value.earlierContext) &&
    isContextSection(value.longTermBackground)
  );
}

function isFactsSurface(value: unknown): value is MemoryFactsSurface {
  return (
    isRecord(value) &&
    typeof value.lastUpdated === "string" &&
    Array.isArray(value.facts)
  );
}

async function readCanonicalResponse<T>(
  response: Response,
  validator: (value: unknown) => value is T,
  actionLabel: string,
): Promise<T> {
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(`Canonical memory request failed (${response.status})`);
  }
  if (!validator(payload)) {
    throw new Error(`Invalid canonical memory payload returned from ${actionLabel}`);
  }
  return payload;
}

export async function loadMemoryUserSurface(): Promise<MemoryUserSurface> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory-canonical/user`);
  return readCanonicalResponse(response, isUserSurface, "loadMemoryUserSurface");
}

export async function loadMemoryHistorySurface(): Promise<MemoryHistorySurface> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory-canonical/history`);
  return readCanonicalResponse(response, isHistorySurface, "loadMemoryHistorySurface");
}

export async function loadMemoryFactsSurface(): Promise<MemoryFactsSurface> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory-canonical/facts`);
  return readCanonicalResponse(response, isFactsSurface, "loadMemoryFactsSurface");
}
