export interface MemoryGrowthItem {
  memory_id: string;
  domain: string;
  subtype: string;
  status: string;
  title?: string | null;
  summary: string;
}

export interface MemoryGrowthResponse {
  learning: MemoryGrowthItem[];
  procedures: MemoryGrowthItem[];
  soul_proposals: MemoryGrowthItem[];
}

export interface UserModelItemsResponse {
  items: MemoryGrowthItem[];
}
