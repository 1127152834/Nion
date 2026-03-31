export type MemoryProviderCapabilitySupport =
  | "supported"
  | "partial"
  | "unsupported";

export type MemoryProviderHealth =
  | "healthy"
  | "degraded"
  | "error"
  | "unknown";

export interface MemoryProviderCapabilities {
  memory_crud: MemoryProviderCapabilitySupport;
  memory_search: MemoryProviderCapabilitySupport;
  compact: MemoryProviderCapabilitySupport;
  rebuild: MemoryProviderCapabilitySupport;
  usage: MemoryProviderCapabilitySupport;
  runtime_status: MemoryProviderCapabilitySupport;
  notebook_resources: MemoryProviderCapabilitySupport;
  autodream_entries: MemoryProviderCapabilitySupport;
}

export interface MemoryProviderRuntimeStatus {
  provider: string;
  runtime_mode: string;
  health: MemoryProviderHealth;
  summary: string;
  details?: Record<string, unknown>;
}

export interface MemoryProviderHealthSummary {
  provider: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface MemoryProviderFamily {
  family: string;
  display_name: string;
  supported_domains: string[];
  supported_modes: string[];
  capabilities: MemoryProviderCapabilities;
}

export interface MemoryProviderFamiliesResponse {
  families: MemoryProviderFamily[];
}

export interface MemoryProviderInstance {
  id: string;
  family: string;
  name: string;
  config: Record<string, unknown>;
  runtime_mode: string;
  health: MemoryProviderHealth;
  capabilities: MemoryProviderCapabilities;
  status: Record<string, unknown>;
  status_summary: MemoryProviderRuntimeStatus | null;
  usage_summary: Record<string, unknown>;
}

export interface ActiveMemoryProviderSummary {
  family: string;
  display_name: string;
  runtime_mode: string;
  health: MemoryProviderHealth;
  capabilities: MemoryProviderCapabilities;
  status_summary: MemoryProviderRuntimeStatus | null;
  usage_summary: Record<string, unknown> | null;
}

export interface MemoryProviderState {
  active_provider_family: string;
  active_provider_id: string | null;
  active_provider: ActiveMemoryProviderSummary | null;
  providers: MemoryProviderInstance[];
}
