import { getBackendBaseURL } from "../config/index.ts";

import type { UserMemory } from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isContextSection(value: unknown): boolean {
  return (
    isObjectRecord(value) &&
    typeof value.summary === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isFact(value: unknown): boolean {
  return (
    isObjectRecord(value) &&
    typeof value.id === "string" &&
    typeof value.content === "string" &&
    typeof value.category === "string" &&
    typeof value.confidence === "number" &&
    typeof value.createdAt === "string" &&
    typeof value.source === "string"
  );
}

function isUserMemory(value: unknown): value is UserMemory {
  if (!isObjectRecord(value)) {
    return false;
  }

  const user = value.user;
  const history = value.history;

  return (
    typeof value.version === "string" &&
    typeof value.lastUpdated === "string" &&
    isObjectRecord(user) &&
    isContextSection(user.workContext) &&
    isContextSection(user.personalContext) &&
    isContextSection(user.topOfMind) &&
    isObjectRecord(history) &&
    isContextSection(history.recentMonths) &&
    isContextSection(history.earlierContext) &&
    isContextSection(history.longTermBackground) &&
    Array.isArray(value.facts) &&
    value.facts.every(isFact)
  );
}

function getErrorMessage(status: number, payload: unknown): string {
  if (isObjectRecord(payload) && typeof payload.detail === "string") {
    return `Failed to load memory (${status}): ${payload.detail}`;
  }

  return `Failed to load memory (${status})`;
}

export async function loadMemory() {
  const memory = await fetch(`${getBackendBaseURL()}/api/memory`);
  const payload = (await memory.json().catch(() => null)) as unknown;

  if (!memory.ok) {
    throw new Error(getErrorMessage(memory.status, payload));
  }

  if (!isUserMemory(payload)) {
    throw new Error("Invalid memory payload");
  }

  return payload;
}
