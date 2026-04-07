import type { MemoryGrowthItem } from "@/core/memory-growth/types";
import type { SoulEvent } from "./types";

export function describeSoulSummary(input: {
  currentSoul: MemoryGrowthItem | null;
  coreSoul: MemoryGrowthItem | null;
  stagedIdentityNarrative?: MemoryGrowthItem | null;
  summary?: {
    baseline: string | null;
    relationship: string | null;
    current: string | null;
  } | null;
}) {
  return {
    title: "当前的我",
    summary:
      input.summary?.current ??
      input.currentSoul?.summary ??
      input.summary?.baseline ??
      input.coreSoul?.summary ??
      "当前还没有形成稳定的灵魂摘要。",
    baselineLabel: "当前长期基线",
    relationshipLabel: "当前关系姿态",
    relationLabel: "relationship-oriented identity",
    identityLabel: "identity narrative",
    relationshipSummary:
      input.summary?.relationship ?? "当前还没有形成稳定的关系姿态摘要。",
    stagedLabel: "我正在变成什么样",
    stagedSummary:
      input.stagedIdentityNarrative?.summary ?? "当前还没有形成中的身份叙事草稿。",
  };
}

export function describeSoulGrowthEvents(
  items: Array<MemoryGrowthItem | SoulEvent>,
  uiState?: {
    lastAcceptedProposalId: string | null;
    lastRejectedProposalId: string | null;
  },
) {
  return items.map((item) => {
    const eventType =
      "event_type" in item
        ? item.event_type
        : item.subtype === "adaptive_overlay" && item.status === "archived"
          ? "overlay_rollback"
          : item.subtype === "proposal" && item.status === "candidate"
            ? "proposal_generated"
            : "proposal_accepted";
    const label = getSoulEventLabel(eventType, item.memory_id, uiState);
    return {
      id: item.memory_id,
      label,
      summary: item.summary,
      detail: getSoulEventDetail("event_type" in item ? item : null),
    };
  });
}

function getSoulEventLabel(
  eventType: string,
  memoryId: string,
  uiState?: {
    lastAcceptedProposalId: string | null;
    lastRejectedProposalId: string | null;
  },
) {
  if (memoryId === uiState?.lastAcceptedProposalId) {
    return "刚刚生效";
  }
  if (memoryId === uiState?.lastRejectedProposalId) {
    return "已拒绝";
  }
  switch (eventType) {
    case "overlay_rollback":
      return "已回退";
    case "proposal_rejected":
      return "已拒绝";
    case "proposal_accepted":
      return "刚刚生效";
    case "identity_narrative_staged":
      return "叙事草稿生成";
    case "identity_narrative_promoted":
      return "身份叙事晋升";
    case "relationship_soul_refreshed":
      return "关系姿态刷新";
    case "soul_journal_written":
      return "反思日志写入";
    case "soul_automation_created":
      return "成长动作外化";
    case "proposal_generated":
      return "提案生成";
    default:
      return "最近成长";
  }
}

function getSoulEventDetail(item: SoulEvent | null) {
  if (!item) {
    return null;
  }
  switch (item.event_type) {
    case "identity_narrative_promoted":
      return item.related_memory_id ? `由 ${item.related_memory_id} 晋升为当前叙事` : "已进入当前身份叙事";
    case "relationship_soul_refreshed":
      return item.related_memory_id ? `来源 ${item.related_memory_id}` : "来源于长期 relationship 证据";
    case "soul_journal_written":
      return typeof item.metadata?.journal_path === "string" ? "已记录到 soul journal" : "已完成一轮灵魂反思";
    case "soul_automation_created":
      return item.related_memory_id ? `来源记忆 ${item.related_memory_id}` : "来源于稳定成长结果";
    default:
      return null;
  }
}
