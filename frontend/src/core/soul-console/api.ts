import type { MemoryLedgerRevision } from "@/core/memory-ledger/types";
import { loadSoulEvents, loadSoulProposals, loadSoulSummary } from "@/core/soul/api";
import type { SoulEvent, SoulSummaryResponse } from "@/core/soul/types";

import type {
  BuildSoulConsoleInput,
  SoulConsoleMemoryRecord,
  SoulConsoleLayer,
  SoulConsoleResponse,
} from "./types";

function findRevision(
  revisions: MemoryLedgerRevision[],
  memoryId: string | null | undefined,
) {
  if (!memoryId) {
    return null;
  }

  return revisions.find((item) => item.memory_id === memoryId) ?? null;
}

function findLastEventForMemory(
  events: SoulEvent[],
  memoryId: string | null | undefined,
) {
  if (!memoryId) {
    return null;
  }

  return (
    events.find(
      (item) => item.memory_id === memoryId || item.related_memory_id === memoryId,
    ) ?? null
  );
}

function findLatestProposal(proposals: SoulConsoleMemoryRecord[]) {
  return proposals[0] ?? null;
}

function formatRevisionLabel(revision: MemoryLedgerRevision | null) {
  return revision ? `r${revision.revision_number}` : "未绑定 revision";
}

function formatLayer(input: {
  id: SoulConsoleLayer["id"];
  label: string;
  summary: string | null | undefined;
  fallbackSummary: string;
  reason: string;
  time: string | null | undefined;
  memory: SoulConsoleMemoryRecord | null;
  revision: MemoryLedgerRevision | null;
  editable: boolean;
  actionLabel?: string;
}) {
  return {
    id: input.id,
    label: input.label,
    summary: input.summary?.trim() || input.fallbackSummary,
    reason: input.reason,
    time: input.time ?? null,
    revisionLabel: formatRevisionLabel(input.revision),
    revisionId: input.revision?.revision_id ?? null,
    memoryId: input.memory?.memory_id ?? null,
    evidenceRef: input.revision?.evidence_ref ?? null,
    editable: input.editable,
    actionLabel: input.actionLabel,
    artifactUri: input.memory?.artifact_uri ?? null,
  } satisfies SoulConsoleLayer;
}

export function buildSoulConsoleResponse(
  input: BuildSoulConsoleInput,
): SoulConsoleResponse {
  const constitutionRevision = findRevision(
    input.revisions,
    input.summary.core_soul?.memory_id,
  );
  const identityRevision = findRevision(
    input.revisions,
    input.summary.staged_identity_narrative?.memory_id,
  );
  const overlayRevision = findRevision(
    input.revisions,
    input.summary.current_soul?.memory_id,
  );
  const latestProposal = findLatestProposal(input.proposals);
  const relationshipEvent = findLastEventForMemory(
    input.events,
    input.summary.current_soul?.memory_id,
  );
  const identityEvent = findLastEventForMemory(
    input.events,
    input.summary.staged_identity_narrative?.memory_id,
  );
  const overlayEvent = findLastEventForMemory(
    input.events,
    input.summary.current_soul?.memory_id,
  );

  const layers: SoulConsoleLayer[] = [
    formatLayer({
      id: "constitution",
      label: "constitution",
      summary: input.summary.summary.baseline,
      fallbackSummary: "当前还没有稳定的 constitution。",
      reason: "长期稳定证据形成的默认基线，不因单次会话快速重写。",
      time:
        input.summary.core_soul?.updated_at ??
        input.summary.core_soul?.created_at ??
        constitutionRevision?.created_at ??
        null,
      memory: input.summary.core_soul,
      revision: constitutionRevision,
      editable: false,
    }),
    formatLayer({
      id: "identity_narrative",
      label: "identity narrative",
      summary: input.summary.staged_identity_narrative?.summary,
      fallbackSummary: "当前还没有形成中的 identity narrative 草稿。",
      reason:
        identityEvent?.summary ??
        "近期成长事件会先沉淀为叙事草稿，再决定是否晋升为长期自我叙事。",
      time:
        input.summary.staged_identity_narrative?.updated_at ??
        input.summary.staged_identity_narrative?.created_at ??
        identityEvent?.created_at ??
        identityRevision?.created_at ??
        null,
      memory: input.summary.staged_identity_narrative,
      revision: identityRevision,
      editable: false,
    }),
    formatLayer({
      id: "relationship_stance",
      label: "relationship stance",
      summary: input.summary.summary.relationship,
      fallbackSummary: "当前还没有稳定的 relationship stance。",
      reason:
        latestProposal?.summary ??
        relationshipEvent?.summary ??
        "relationship stance 由长期 relationship 证据与最近稳定信号共同推导。",
      time:
        relationshipEvent?.created_at ??
        latestProposal?.updated_at ??
        latestProposal?.created_at ??
        input.summary.current_soul?.updated_at ??
        null,
      memory: latestProposal,
      revision: findRevision(input.revisions, latestProposal?.memory_id),
      editable: true,
      actionLabel: "编辑 relationship stance",
    }),
    formatLayer({
      id: "adaptive_overlay",
      label: "adaptive overlay",
      summary: input.summary.summary.current ?? input.summary.current_soul?.summary,
      fallbackSummary: "当前没有 active adaptive overlay。",
      reason:
        overlayEvent?.summary ??
        "这是当前对外表达的活动层，会根据近期上下文快速调整。",
      time:
        input.summary.current_soul?.updated_at ??
        input.summary.current_soul?.created_at ??
        overlayEvent?.created_at ??
        overlayRevision?.created_at ??
        null,
      memory: input.summary.current_soul,
      revision: overlayRevision,
      editable: true,
      actionLabel: "编辑 adaptive overlay",
    }),
  ];

  return {
    layers,
    currentRevisionReason:
      overlayEvent?.summary ??
      latestProposal?.summary ??
      "当前 revision 由最近的 soul proposal 与 growth event 共同说明。",
    currentRevisionTime:
      input.summary.current_soul?.updated_at ??
      input.summary.current_soul?.created_at ??
      overlayEvent?.created_at ??
      null,
  };
}

export async function loadSoulConsole(
  revisions: MemoryLedgerRevision[],
): Promise<SoulConsoleResponse> {
  const [summary, proposals, events] = await Promise.all([
    loadSoulSummary(),
    loadSoulProposals(),
    loadSoulEvents(),
  ]);

  return buildSoulConsoleResponse({
    summary: summary as SoulSummaryResponse & BuildSoulConsoleInput["summary"],
    proposals: proposals.proposals as SoulConsoleMemoryRecord[],
    events: events.events,
    revisions,
  });
}
