export interface SoulSettingsResponse {
  core_identity: string;
  speech_style: string;
  values_and_boundaries: string;
  relationship_stance: string;
  has_active_overlay: boolean;
  adaptive_overlay_summary: string | null;
}

export type SoulSettingsField =
  | "core_identity"
  | "speech_style"
  | "values_and_boundaries"
  | "relationship_stance";

export interface SoulSettingsPatchRequest {
  field: SoulSettingsField;
  value: string;
}

export interface SoulSettingsMutationResult {
  action: string;
  field: SoulSettingsField;
  value: string;
}
