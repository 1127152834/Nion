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
  isFrozen?: boolean;
}

export interface SoulConsoleResponse {
  layers: SoulConsoleLayer[];
  currentRevisionReason: string;
  currentRevisionTime: string | null;
}

export interface SoulConsoleMutationResult {
  memory_id: string;
  action: string;
  layer?: string;
  summary?: string;
}
