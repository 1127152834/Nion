export interface ConfigSectionSchema {
  title: string;
  description: string;
}

export interface ConfigReadResponse {
  version: string;
  source_path: string;
  yaml_text: string;
  config: Record<string, unknown>;
}

export interface ConfigSchemaResponse {
  sections: Record<string, ConfigSectionSchema>;
  order: string[];
}

export interface ConfigValidateErrorItem {
  path: string[];
  message: string;
  type: string;
}

export interface ConfigValidateWarningItem {
  path: string[];
  message: string;
  type: string;
}

export interface ConfigValidateRequest {
  config?: Record<string, unknown>;
  yaml_text?: string;
}

export interface ConfigValidateResponse {
  valid: boolean;
  errors: ConfigValidateErrorItem[];
  warnings: ConfigValidateWarningItem[];
  config?: Record<string, unknown>;
  yaml_text?: string;
}

export interface ConfigUpdateRequest {
  version: string;
  config?: Record<string, unknown>;
  yaml_text?: string;
}

export interface ConfigUpdateResponse {
  version: string;
  source_path: string;
  yaml_text: string;
  config: Record<string, unknown>;
  warnings: ConfigValidateWarningItem[];
}

export interface ConfigRuntimeProcessInfo {
  loaded_version?: string | null;
  source_path?: string | null;
  tools_count?: number | null;
  status?: string;
  reason?: string | null;
  updated_at?: string | null;
}

export interface ConfigRuntimeStatusResponse {
  process_name: string;
  store_version?: string | null;
  store_source_path?: string | null;
  loaded_version?: string | null;
  loaded_source_path?: string | null;
  source_kind?: string;
  tools_count?: number;
  loaded_tools?: string[];
  last_loaded_at?: string | null;
  last_error?: string | null;
  runtime_processes?: Record<string, ConfigRuntimeProcessInfo>;
  is_in_sync?: boolean;
  warnings?: string[];
}

export interface ApiErrorDetail {
  message?: string;
  current_version?: string;
  errors?: ConfigValidateErrorItem[];
  warnings?: ConfigValidateWarningItem[];
}

export class ConfigCenterApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail: ApiErrorDetail | string | null = null,
  ) {
    super(message);
    this.name = "ConfigCenterApiError";
  }
}

