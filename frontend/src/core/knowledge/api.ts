import { getBackendBaseURL } from "../config/index.ts";

import type { KnowledgePage, KnowledgeSourceCandidate } from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveErrorMessage(rawText: string, fallback: string): string {
  const text = rawText.trim();
  if (!text) {
    return fallback;
  }
  try {
    const payload = JSON.parse(text) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  } catch {
    // keep raw text
  }
  return text;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function isKnowledgeSourceCandidate(value: unknown): value is KnowledgeSourceCandidate {
  return (
    isObjectRecord(value) &&
    typeof value.source_id === "string" &&
    (value.source_kind === "notebook_note" || value.source_kind === "notebook_asset") &&
    isObjectRecord(value.notebook_ref) &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    typeof value.content_hash === "string" &&
    typeof value.status === "string" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isKnowledgePage(value: unknown): value is KnowledgePage {
  return (
    isObjectRecord(value) &&
    typeof value.page_id === "string" &&
    typeof value.page_type === "string" &&
    typeof value.title === "string" &&
    typeof value.relative_path === "string" &&
    typeof value.absolute_path === "string" &&
    typeof value.body === "string" &&
    Array.isArray(value.sources) &&
    Array.isArray(value.compiled_from) &&
    typeof value.last_compiled_at === "string" &&
    typeof value.agent_owned === "boolean" &&
    typeof value.human_editable === "boolean"
  );
}

export async function loadKnowledgeQueue(): Promise<KnowledgeSourceCandidate[]> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/queue`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load knowledge queue (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!Array.isArray(payload) || !payload.every(isKnowledgeSourceCandidate)) {
    throw new Error("Invalid knowledge queue payload returned from loadKnowledgeQueue");
  }
  return payload;
}

export async function loadKnowledgePage(pageId: string): Promise<KnowledgePage> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/pages/${pageId}`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load knowledge page (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgePage(payload)) {
    throw new Error("Invalid knowledge page payload returned from loadKnowledgePage");
  }
  return payload;
}
