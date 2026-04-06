import type { MemoryGrowthItem } from "@/core/memory-growth/types";

export interface SoulSummaryResponse {
  current_soul: MemoryGrowthItem | null;
  core_soul: MemoryGrowthItem | null;
  summary: {
    baseline: string | null;
    relationship: string | null;
    current: string | null;
  };
}

export interface SoulProposalResponse {
  proposals: MemoryGrowthItem[];
}
