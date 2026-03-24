export interface CLIStateConfig {
  id: string;
  enabled: boolean;
  source: string;
  description: string;
}

export interface CLIConfig {
  clis: Record<string, CLIStateConfig>;
}

