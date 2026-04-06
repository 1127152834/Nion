import type { MemoryGrowthItem } from "@/core/memory-growth/types";

export function describeSoulSummary(input: {
  currentSoul: MemoryGrowthItem | null;
  coreSoul: MemoryGrowthItem | null;
}) {
  return {
    title: "当前的我",
    summary:
      input.currentSoul?.summary ??
      input.coreSoul?.summary ??
      "当前还没有形成稳定的灵魂摘要。",
    baselineLabel: "当前长期基线",
    relationshipLabel: "当前关系姿态",
    relationLabel: "relationship-oriented identity",
    identityLabel: "identity narrative",
  };
}
