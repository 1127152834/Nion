export type ProviderCategory = "domestic" | "aggregator" | "global" | "local";
export type ProviderProtocol =
  | "openai-compatible"
  | "anthropic-compatible"
  | "custom";
export type ProviderBaseUrlMode = "fixed" | "editable" | "hidden";
export type ProviderDiscoveryMode = "api" | "static" | "manual" | "none";
export type ProviderKind = "builtin" | "custom";
export type ProviderStatus = "active" | "disabled" | "draft" | "error";
export type ProviderTestStatus = "untested" | "success" | "failed";
export type ProviderModelSource = "seeded" | "discovered" | "manual";
export type ModelBindingStatus = "active" | "disabled";

export interface ProviderTemplate {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: ProviderCategory | null;
  icon?: string | null;
  protocol: ProviderProtocol;
  base_url_mode: ProviderBaseUrlMode;
  base_url?: string | null;
  api_key_apply_url?: string | null;
  supports_model_discovery: boolean;
  discovery_mode: ProviderDiscoveryMode;
  allows_multiple_instances: boolean;
  requires_api_key: boolean;
  editable_schema_json?: Record<string, unknown> | null;
  badge?: string | null;
  network_notice?: string | null;
  is_builtin: boolean;
  status: ProviderStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderModelRecord {
  id: string;
  provider_instance_id: string;
  model_id: string;
  display_name: string;
  model_type?: string | null;
  source: ProviderModelSource;
  is_enabled: boolean;
  is_primary: boolean;
  priority_order: number;
  supports_thinking?: boolean | null;
  supports_reasoning_effort?: boolean | null;
  supports_vision?: boolean | null;
  supports_video?: boolean | null;
  context_window?: number | null;
  max_output_tokens?: number | null;
  metadata_json?: Record<string, unknown> | null;
  model_test_status: ProviderTestStatus;
  model_test_message?: string | null;
  model_test_latency_ms?: number | null;
  model_test_preview?: string | null;
  model_last_tested_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderInstanceRecord {
  id: string;
  provider_template_id?: string | null;
  kind: ProviderKind;
  display_name: string;
  protocol_override?: ProviderProtocol | null;
  base_url_override?: string | null;
  custom_headers_json?: Record<string, string> | null;
  api_key_masked?: string | null;
  auth_config_json?: Record<string, unknown> | null;
  status: ProviderStatus;
  provider_test_status: ProviderTestStatus;
  provider_test_message?: string | null;
  provider_test_latency_ms?: number | null;
  provider_last_tested_at?: string | null;
  provider_test_signature?: string | null;
  last_discovery_at?: string | null;
  last_discovery_status?: ProviderTestStatus | null;
  last_discovery_message?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  template?: ProviderTemplate | null;
  models: ProviderModelRecord[];
  primary_model_id?: string | null;
}

export interface ModelBindingRecord {
  id: string;
  binding_key: string;
  provider_model_id: string;
  fallback_provider_model_id?: string | null;
  status: ModelBindingStatus;
  created_at: string;
  updated_at: string;
}

export interface ProviderConnectionTestResult {
  success: boolean;
  message: string;
  latency_ms?: number | null;
  response_preview?: string | null;
}

export interface ProviderDiscoveryModelOption {
  id: string;
  name?: string | null;
  supports_thinking?: boolean | null;
  supports_vision?: boolean | null;
  supports_video?: boolean | null;
  context_window?: number | null;
  max_output_tokens?: number | null;
  source?: string | null;
}

export interface ProviderDiscoveryResult {
  success: boolean;
  message: string;
  provider_type: string;
  models: ProviderDiscoveryModelOption[];
}

export interface LoadProviderTemplatesOptions {
  category?: ProviderCategory;
}

export interface CreateProviderInstancePayload {
  provider_template_id?: string | null;
  kind?: ProviderKind;
  display_name?: string | null;
  protocol_override?: ProviderProtocol | null;
  base_url_override?: string | null;
  custom_headers_json?: Record<string, string> | null;
  api_key?: string | null;
  auth_config_json?: Record<string, unknown> | null;
  notes?: string | null;
  status?: ProviderStatus;
}

export interface UpdateProviderInstancePayload {
  display_name?: string | null;
  protocol_override?: ProviderProtocol | null;
  base_url_override?: string | null;
  custom_headers_json?: Record<string, string> | null;
  api_key?: string | null;
  auth_config_json?: Record<string, unknown> | null;
  notes?: string | null;
  status?: ProviderStatus;
}

export interface ProviderExecutionPayload {
  timeout_seconds?: number;
  probe_message?: string;
}

export interface AddProviderModelPayload {
  model_id: string;
  display_name?: string | null;
  model_type?: string | null;
  source?: ProviderModelSource;
  is_enabled?: boolean;
  is_primary?: boolean;
  priority_order?: number | null;
  supports_thinking?: boolean | null;
  supports_reasoning_effort?: boolean | null;
  supports_vision?: boolean | null;
  supports_video?: boolean | null;
  context_window?: number | null;
  max_output_tokens?: number | null;
  metadata_json?: Record<string, unknown> | null;
}

export interface AddProviderModelsRequest {
  models: AddProviderModelPayload[];
}

export interface UpdateProviderModelPayload {
  model_id?: string | null;
  display_name?: string | null;
  model_type?: string | null;
  is_enabled?: boolean;
  is_primary?: boolean;
  priority_order?: number | null;
  supports_thinking?: boolean | null;
  supports_reasoning_effort?: boolean | null;
  supports_vision?: boolean | null;
  supports_video?: boolean | null;
  context_window?: number | null;
  max_output_tokens?: number | null;
  metadata_json?: Record<string, unknown> | null;
}

export interface UpdateBindingPayload {
  provider_model_id: string;
  fallback_provider_model_id?: string | null;
  status?: ModelBindingStatus;
}
