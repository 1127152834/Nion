export interface MemoryGrowthItemV2 {
  memory_id: string;
  domain: string;
  subtype: string;
  status: string;
  title?: string | null;
  summary: string;
}

export interface MemoryGrowthResponseV2 {
  learning: MemoryGrowthItemV2[];
  procedures: MemoryGrowthItemV2[];
  soul_proposals: MemoryGrowthItemV2[];
}
