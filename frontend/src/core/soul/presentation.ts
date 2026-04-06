import type { MemoryGrowthItem } from "@/core/memory-growth/types";

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
