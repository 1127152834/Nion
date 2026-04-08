import type { MemoryLedgerRevision } from "@/core/memory-ledger/types";
import type { MemoryGrowthItem } from "@/core/memory-growth/types";
import type { SoulEvent } from "@/core/soul/types";

export interface SoulConsoleMemoryRecord extends MemoryGrowthItem {
  created_at?: string | null;
  updated_at?: string | null;
  artifact_uri?: string | null;
  confidence?: number | null;
}

export type SoulConsoleLayerId =
  | "constitution"
  | "identity_narrative"
  | "relationship_stance"
  | "adaptive_overlay";

export interface SoulConsoleLayer {
  id: SoulConsoleLayerId;
  label: string;
  summary: string;
  reason: string;
  time: string | null;
  revisionLabel: string;
  revisionId: string | null;
  memoryId: string | null;
  evidenceRef: string | null;
  editable: boolean;
  actionLabel?: string;
  artifactUri: string | null;
}

export interface SoulConsoleResponse {
  layers: SoulConsoleLayer[];
  currentRevisionReason: string;
  currentRevisionTime: string | null;
}

export interface BuildSoulConsoleInput {
  summary: {
    core_soul: SoulConsoleMemoryRecord | null;
    current_soul: SoulConsoleMemoryRecord | null;
    staged_identity_narrative: SoulConsoleMemoryRecord | null;
    summary: {
      baseline: string | null;
      relationship: string | null;
      current: string | null;
    };
  };
  proposals: SoulConsoleMemoryRecord[];
  events: SoulEvent[];
  revisions: MemoryLedgerRevision[];
}
