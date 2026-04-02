import { getBackendBaseURL } from "../config/index.ts";

import type {
  MemoryFactInput,
  MemoryFactPatchInput,
  UserMemory,
} from "./types";

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
    return `Memory request failed (${status}): ${payload.detail}`;
  }

  return `Memory request failed (${status})`;
}

async function readMemoryResponse(
  response: Response,
  actionLabel: string,
): Promise<UserMemory> {
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(response.status, payload));
  }

  if (!isUserMemory(payload)) {
    throw new Error(`Invalid memory payload returned from ${actionLabel}`);
  }

  return payload;
}

export async function loadMemory() {
  const response = await fetch(`${getBackendBaseURL()}/api/memory`);
  return readMemoryResponse(response, "loadMemory");
}

export async function clearMemory() {
  const response = await fetch(`${getBackendBaseURL()}/api/memory`, {
    method: "DELETE",
  });
  return readMemoryResponse(response, "clearMemory");
}

export async function deleteMemoryFact(factId: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/facts/${encodeURIComponent(factId)}`,
    {
      method: "DELETE",
    },
  );
  return readMemoryResponse(response, "deleteMemoryFact");
}

export async function exportMemory() {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/export`);
  return readMemoryResponse(response, "exportMemory");
}

export async function importMemory(memory: UserMemory) {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(memory),
  });
  return readMemoryResponse(response, "importMemory");
}

export async function createMemoryFact(input: MemoryFactInput) {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/facts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readMemoryResponse(response, "createMemoryFact");
}

export async function updateMemoryFact(
  factId: string,
  input: MemoryFactPatchInput,
) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/facts/${encodeURIComponent(factId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  return readMemoryResponse(response, "updateMemoryFact");
}
