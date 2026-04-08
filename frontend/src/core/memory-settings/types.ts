export interface MemorySettingsMode {
  id: string;
  label: string;
  description: string;
}

export interface MemorySettingsDownloadStatus {
  state: string;
  detail: string;
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
  vector_path: string;
  artifact_count: number;
}

export interface MemorySettingsResponse {
  provider_mode: MemorySettingsMode;
  download_status: MemorySettingsDownloadStatus;
  active_fingerprint: MemorySettingsFingerprint;
  index_health: MemorySettingsIndexHealth;
}
