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
  return items.map((item) => ({
    id: item.memory_id,
    label:
      item.memory_id === uiState?.lastAcceptedProposalId
        ? "刚刚生效"
        : item.memory_id === uiState?.lastRejectedProposalId
          ? "已拒绝"
          : "event_type" in item && item.event_type === "overlay_rollback"
        ? "已回退"
        : "event_type" in item && item.event_type === "proposal_rejected"
          ? "已拒绝"
          : "event_type" in item && item.event_type === "proposal_accepted"
            ? "刚刚生效"
          : "subtype" in item && item.subtype === "adaptive_overlay" && item.status === "archived"
        ? "已回退"
        : "subtype" in item && item.subtype === "proposal" && item.status === "candidate"
          ? "提案生成"
          : "刚刚生效",
    summary: item.summary,
  }));
}
