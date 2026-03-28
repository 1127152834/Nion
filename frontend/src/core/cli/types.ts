export interface CLIStateConfig {
  id: string;
  displayName?: string | null;
  enabled: boolean;
  allowed: boolean;
  installed: boolean;
  configured: boolean;
  source: string;
  description: string;
  path?: string | null;
  version?: string | null;
}

export interface CLIConfig {
  clis: Record<string, CLIStateConfig>;
}

export interface CLIStateConfigUpdatePayload {
  enabled: boolean;
  description?: string | null;
}

export type CliToolPlatform = "darwin" | "linux" | "win32";
export type CliToolCategory =
  | "media"
  | "data"
  | "search"
  | "download"
  | "document"
  | "productivity";
export type CliToolStatus = "not_installed" | "installed" | "needs_auth" | "ready";

export interface CliToolExamplePrompt {
  label: string;
  promptZh: string;
  promptEn: string;
}

export interface CliToolStructuredDesc {
  intro: { zh: string; en: string };
  useCases: { zh: string[]; en: string[] };
  guideSteps: { zh: string[]; en: string[] };
  examplePrompts: CliToolExamplePrompt[];
}

export interface CliToolInstallMethod {
  method: string;
  command: string;
  platforms: CliToolPlatform[];
}

export interface CliToolDefinition {
  id: string;
  name: string;
  binNames: string[];
  summaryZh: string;
  summaryEn: string;
  categories: CliToolCategory[];
  installMethods: CliToolInstallMethod[];
  setupType: "simple" | "needs_auth";
  detailIntro: { zh: string; en: string };
  useCases: { zh: string[]; en: string[] };
  guideSteps: { zh: string[]; en: string[] };
  examplePrompts: CliToolExamplePrompt[];
  homepage?: string | null;
  repoUrl?: string | null;
  officialDocsUrl?: string | null;
  supportsAutoDescribe?: boolean;
}

export interface CliToolRuntimeInfo {
  id: string;
  displayName?: string | null;
  status: CliToolStatus;
  version: string | null;
  binPath: string | null;
}

export interface CustomCliTool {
  id: string;
  name: string;
  binPath: string;
  binName: string;
  version: string | null;
  installMethod: string;
  installPackage: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CliToolDescriptionRecord {
  zh: string;
  en: string;
  structured?: CliToolStructuredDesc;
}

export interface CliToolsCatalogResponse {
  tools: CliToolDefinition[];
}

export interface CliToolsInstalledResponse {
  tools: CliToolRuntimeInfo[];
  extra: CliToolRuntimeInfo[];
  custom: CustomCliTool[];
  descriptions: Record<string, CliToolDescriptionRecord>;
  platform: string;
  hasBrew: boolean;
}

export interface CliToolsDescribeOptionsResponse {
  groups: Array<{
    provider_id: string;
    provider_name: string;
    models: Array<{ value: string; label: string }>;
  }>;
  default_provider_id: string;
}

export interface CliToolItem {
  id: string;
  name: string;
  summary: string;
  version?: string | null;
}
