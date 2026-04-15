import { getBackendBaseURL } from "../config/index.ts";

import type {
  KnowledgeActivityEvent,
  KnowledgeActivityListResponse,
  KnowledgeGraphPayload,
  KnowledgeLintReport,
  KnowledgePage,
  KnowledgeCitation,
  KnowledgeCompileJobListResponse,
  NotebookKnowledgeStatus,
  KnowledgeQueryResult,
  KnowledgeRevisionRequest,
  KnowledgeCompileJob,
  KnowledgeSourceCandidate,
} from "./types";

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

const NOTEBOOK_KNOWLEDGE_STATUSES = new Set([
  "queued",
  "running",
  "compiled",
  "failed",
  "stale",
  "source_missing",
]);

const NOTEBOOK_KNOWLEDGE_ENQUEUE_STATES = new Set(["not_enqueued", "enqueued"]);

const NOTEBOOK_KNOWLEDGE_COMPILE_STATES = new Set([
  "idle",
  "pending",
  "running",
  "succeeded",
  "failed",
]);

const KNOWLEDGE_COMPILE_JOB_STAGES = new Set([
  "queued",
  "snapshotting",
  "extracting",
  "writing_pages",
  "rebuilding_graph",
  "finalizing",
]);

const KNOWLEDGE_COMPILE_JOB_STATUSES = new Set([
  "pending",
  "running",
  "succeeded",
  "failed",
  "partially_succeeded",
]);

const KNOWLEDGE_COMPILE_JOB_OUTPUT_KEYS = [
  "created_pages",
  "created_page_ids",
  "updated_pages",
  "stale_pages",
  "archived_pages",
] as const;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isKnowledgeCompileJobOutputs(
  value: unknown,
): value is KnowledgeCompileJob["outputs"] {
  return (
    isObjectRecord(value) &&
    Object.keys(value).length === KNOWLEDGE_COMPILE_JOB_OUTPUT_KEYS.length &&
    KNOWLEDGE_COMPILE_JOB_OUTPUT_KEYS.every((key) => isStringArray(value[key]))
  );
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
    typeof value.page_state === "string" &&
    ["active", "stale", "archived"].includes(value.page_state) &&
    typeof value.agent_owned === "boolean" &&
    typeof value.human_editable === "boolean"
  );
}

function isKnowledgeCitation(value: unknown): value is KnowledgeCitation {
  return (
    isObjectRecord(value) &&
    typeof value.page_id === "string" &&
    typeof value.title === "string" &&
    typeof value.page_type === "string" &&
    ["source", "entity", "concept", "synthesis", "overview"].includes(value.page_type) &&
    typeof value.page_state === "string" &&
    ["active", "stale", "archived"].includes(value.page_state) &&
    isStringArray(value.source_ids) &&
    typeof value.score === "number"
  );
}

function isKnowledgeQueryResult(value: unknown): value is KnowledgeQueryResult {
  return (
    isObjectRecord(value) &&
    typeof value.answer_markdown === "string" &&
    Array.isArray(value.citations) &&
    value.citations.every(isKnowledgeCitation) &&
    Array.isArray(value.matched_page_ids) &&
    value.matched_page_ids.every((item) => typeof item === "string") &&
    typeof value.retrieval_policy === "string" &&
    ["active_only", "active_with_stale_fallback", "explicit_archived_lookup"].includes(
      value.retrieval_policy,
    ) &&
    Array.isArray(value.warnings) &&
    value.warnings.every((item) => typeof item === "string")
  );
}

function isKnowledgeGraphPayload(value: unknown): value is KnowledgeGraphPayload {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}

function isKnowledgeRevisionRequest(value: unknown): value is KnowledgeRevisionRequest {
  return (
    isObjectRecord(value) &&
    typeof value.request_id === "string" &&
    typeof value.page_id === "string" &&
    typeof value.request_type === "string" &&
    typeof value.instruction === "string" &&
    Array.isArray(value.optional_source_refs) &&
    typeof value.status === "string" &&
    typeof value.created_at === "string"
  );
}

function isKnowledgeLintReport(value: unknown): value is KnowledgeLintReport {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.orphan_pages) &&
    Array.isArray(value.broken_links) &&
    Array.isArray(value.stale_pages) &&
    Array.isArray(value.contradictions) &&
    Array.isArray(value.data_gaps)
  );
}

function isKnowledgeCompileJob(value: unknown): value is KnowledgeCompileJob {
  return (
    isObjectRecord(value) &&
    typeof value.job_id === "string" &&
    isStringArray(value.source_ids) &&
    (value.trigger_mode === "manual" || value.trigger_mode === "queue_approval") &&
    typeof value.stage === "string" &&
    KNOWLEDGE_COMPILE_JOB_STAGES.has(value.stage) &&
    typeof value.status === "string" &&
    KNOWLEDGE_COMPILE_JOB_STATUSES.has(value.status) &&
    isStringArray(value.created_page_ids) &&
    isKnowledgeCompileJobOutputs(value.outputs)
  );
}

function isKnowledgeCompileJobListResponse(
  value: unknown,
): value is KnowledgeCompileJobListResponse {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.jobs) &&
    value.jobs.every(isKnowledgeCompileJob)
  );
}

function isKnowledgeActivityEvent(value: unknown): value is KnowledgeActivityEvent {
  return (
    isObjectRecord(value) &&
    typeof value.event_id === "string" &&
    typeof value.event_type === "string" &&
    typeof value.detail === "string" &&
    typeof value.created_at === "string"
  );
}

function isKnowledgeActivityListResponse(
  value: unknown,
): value is KnowledgeActivityListResponse {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.events) &&
    value.events.every(isKnowledgeActivityEvent)
  );
}

function isNotebookKnowledgeStatus(value: unknown): value is NotebookKnowledgeStatus {
  return (
    isObjectRecord(value) &&
    typeof value.has_knowledge === "boolean" &&
    value.tag_label === "知识库" &&
    typeof value.status === "string" &&
    NOTEBOOK_KNOWLEDGE_STATUSES.has(value.status) &&
    typeof value.enqueue_state === "string" &&
    NOTEBOOK_KNOWLEDGE_ENQUEUE_STATES.has(value.enqueue_state) &&
    typeof value.compile_state === "string" &&
    NOTEBOOK_KNOWLEDGE_COMPILE_STATES.has(value.compile_state) &&
    Array.isArray(value.created_page_ids) &&
    value.created_page_ids.every((item) => typeof item === "string") &&
    (value.last_job_id === undefined || typeof value.last_job_id === "string") &&
    (value.error_summary === undefined || typeof value.error_summary === "string")
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

export async function approveKnowledgeQueue(sourceIds: string[]): Promise<KnowledgeCompileJob> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/queue/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_ids: sourceIds }),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to approve knowledge queue (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeCompileJob(payload)) {
    throw new Error("Invalid knowledge compile job payload returned from approveKnowledgeQueue");
  }
  return payload;
}

export async function enqueueKnowledgeSource(sourceId: string): Promise<NotebookKnowledgeStatus> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/sources/enqueue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_id: sourceId }),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to enqueue knowledge source (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isNotebookKnowledgeStatus(payload)) {
    throw new Error("Invalid knowledge status payload returned from enqueueKnowledgeSource");
  }
  return payload;
}

export async function loadKnowledgeSourceStatus(
  sourceId: string,
): Promise<NotebookKnowledgeStatus> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/knowledge/sources/${encodeURIComponent(sourceId)}/status`,
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load knowledge source status (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isNotebookKnowledgeStatus(payload)) {
    throw new Error("Invalid knowledge status payload returned from loadKnowledgeSourceStatus");
  }
  return payload;
}

export async function loadKnowledgeJobs(): Promise<KnowledgeCompileJobListResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/jobs`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load knowledge jobs (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeCompileJobListResponse(payload)) {
    throw new Error("Invalid knowledge jobs payload returned from loadKnowledgeJobs");
  }
  return payload;
}

export async function loadKnowledgeActivity(): Promise<KnowledgeActivityListResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/activity`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load knowledge activity (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeActivityListResponse(payload)) {
    throw new Error("Invalid knowledge activity payload returned from loadKnowledgeActivity");
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

export async function loadKnowledgePagesFromQueue(
  queue: KnowledgeSourceCandidate[],
): Promise<KnowledgePage[]> {
  const compiledCandidates = queue.filter((item) => item.status === "compiled");
  const pages = await Promise.all(
    compiledCandidates.map(async (item) => {
      const pageId = `sources:${item.source_id.split(":").at(-1) ?? ""}`;
      try {
        return await loadKnowledgePage(pageId);
      } catch {
        return null;
      }
    }),
  );
  return pages.filter((page): page is KnowledgePage => page !== null);
}

export async function queryKnowledge(question: string): Promise<KnowledgeQueryResult> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/knowledge/query?question=${encodeURIComponent(question)}`,
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to query knowledge (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeQueryResult(payload)) {
    throw new Error("Invalid knowledge query payload returned from queryKnowledge");
  }
  return payload;
}

export async function rebuildKnowledgeGraph(): Promise<KnowledgeGraphPayload> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/graph/rebuild`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to rebuild knowledge graph (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeGraphPayload(payload)) {
    throw new Error("Invalid knowledge graph payload returned from rebuildKnowledgeGraph");
  }
  return payload;
}

export async function createKnowledgeRevision(input: {
  page_id: string;
  request_type: string;
  instruction: string;
  optional_source_refs: string[];
}): Promise<KnowledgeRevisionRequest> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/revisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to create knowledge revision (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeRevisionRequest(payload)) {
    throw new Error("Invalid knowledge revision payload returned from createKnowledgeRevision");
  }
  return payload;
}

export async function previewKnowledgeRevision(
  requestId: string,
): Promise<KnowledgeRevisionRequest> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/knowledge/revisions/${requestId}/preview`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to preview knowledge revision (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeRevisionRequest(payload)) {
    throw new Error("Invalid knowledge revision payload returned from previewKnowledgeRevision");
  }
  return payload;
}

export async function closeKnowledgeRevision(
  requestId: string,
): Promise<KnowledgeRevisionRequest> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/knowledge/revisions/${requestId}/close`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to close knowledge revision (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeRevisionRequest(payload)) {
    throw new Error("Invalid knowledge revision payload returned from closeKnowledgeRevision");
  }
  return payload;
}

export async function applyKnowledgeRevision(
  requestId: string,
): Promise<KnowledgeRevisionRequest> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/knowledge/revisions/${requestId}/apply`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to apply knowledge revision (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeRevisionRequest(payload)) {
    throw new Error("Invalid knowledge revision payload returned from applyKnowledgeRevision");
  }
  return payload;
}

export async function saveKnowledgeSynthesis(input: {
  question: string;
  answer_markdown: string;
}): Promise<KnowledgePage> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/syntheses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to save knowledge synthesis (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgePage(payload)) {
    throw new Error("Invalid knowledge page payload returned from saveKnowledgeSynthesis");
  }
  return payload;
}

export async function loadKnowledgeLint(): Promise<KnowledgeLintReport> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/lint`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load knowledge lint (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeLintReport(payload)) {
    throw new Error("Invalid knowledge lint payload returned from loadKnowledgeLint");
  }
  return payload;
}
