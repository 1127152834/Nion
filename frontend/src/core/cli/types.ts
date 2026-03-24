export interface CLIStateConfig {
  id: string;
  enabled: boolean;
  allowed: boolean;
  installed: boolean;
  configured: boolean;
  source: string;
  description: string;
  path?: string | null;
}

export interface CLIConfig {
  clis: Record<string, CLIStateConfig>;
}

export interface CLIStateConfigUpdatePayload {
  enabled: boolean;
  description?: string | null;
}
