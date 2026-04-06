import type { MemoryGrowthItem } from "@/core/memory-growth/types";

export interface SoulSummaryResponse {
  current_soul: MemoryGrowthItem | null;
  core_soul: MemoryGrowthItem | null;
}

export interface SoulProposalResponse {
  proposals: MemoryGrowthItem[];
}
