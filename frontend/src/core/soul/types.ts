import type { MemoryGrowthItem } from "@/core/memory-growth/types";

export interface SoulSummaryResponse {
  current_soul: MemoryGrowthItem | null;
  core_soul: MemoryGrowthItem | null;
  staged_identity_narrative: MemoryGrowthItem | null;
  summary: {
    baseline: string | null;
    relationship: string | null;
    current: string | null;
  };
}

export interface SoulProposalResponse {
  proposals: MemoryGrowthItem[];
}

export interface SoulEvent {
  event_id?: string;
  event_type: string;
  memory_id: string;
  related_memory_id?: string | null;
  summary: string;
  created_at?: string;
  actor?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SoulEventsResponse {
  events: SoulEvent[];
}
