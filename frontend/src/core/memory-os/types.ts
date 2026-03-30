export interface MemoryProviderFamily {
  family: string;
  display_name: string;
  supported_domains: string[];
  supported_modes: string[];
}

export interface MemoryProviderFamiliesResponse {
  families: MemoryProviderFamily[];
}

export interface MemoryProviderInstance {
  id: string;
  family: string;
  name: string;
  config: Record<string, unknown>;
}

export interface MemoryProviderState {
  active_provider_family: string;
  active_provider_id: string | null;
  providers: MemoryProviderInstance[];
}
