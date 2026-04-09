export interface SoulSettingsResponse {
  core_identity: string;
  speech_style: string;
  values_and_boundaries: string;
  relationship_stance: string;
  has_active_overlay: boolean;
  adaptive_overlay_summary: string | null;
}

export interface SoulSettingsDraft {
  core_identity: string;
  speech_style: string;
  values_and_boundaries: string;
  relationship_stance: string;
}

export interface SoulSettingsMutationResult {
  action: string;
  core_identity?: string;
  speech_style?: string;
  values_and_boundaries?: string;
  relationship_stance?: string;
}
