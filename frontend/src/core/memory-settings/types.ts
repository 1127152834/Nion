export interface MemorySettingsMode {
  id: "local_managed" | "remote_managed";
  label: string;
  description: string;
}

export interface MemorySettingsDownloadStatus {
  state: string;
  detail: string;
  progress: {
    percent: number;
    downloaded_bytes: number;
    total_bytes: number;
  };
}

export interface MemorySettingsFingerprint {
  provider_key: string;
  model_key: string;
  fingerprint: string;
  dimensions: number;
  distance_metric: string;
  revision: string | null;
}

export interface MemorySettingsIndexHealth {
  state: string;
  detail: string;
  record_count: number;
  last_rebuild_at: string | null;
}

export interface MemorySettingsLocalConfig {
  model_id: string;
  model_key: string;
}

export interface MemorySettingsRemoteConfig {
  endpoint: string;
  api_key_configured: boolean;
  model_name: string;
  dimensions: number;
}

export interface MemorySettingsResponse {
  provider_mode: MemorySettingsMode;
  download_status: MemorySettingsDownloadStatus;
  active_fingerprint: MemorySettingsFingerprint;
  index_health: MemorySettingsIndexHealth;
  local_config: MemorySettingsLocalConfig;
  remote_config: MemorySettingsRemoteConfig;
}

export interface MemorySettingsPatchRequest {
  mode?: "local_managed" | "remote_managed";
  local_model_id?: string;
  local_model_key?: string;
  remote_endpoint?: string;
  remote_api_key?: string;
  remote_model_name?: string;
  remote_dimensions?: number;
}

export interface MemorySettingsActionResult {
  action: "download" | "rebuild";
  model_dir?: string;
  provider?: Record<string, unknown>;
  job?: {
    state: string;
    record_count: number;
    manifest: Record<string, unknown>;
  };
}
