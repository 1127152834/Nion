import { getBackendBaseURL } from "@/core/config";

import type {
  CLIConfig,
  CLIStateConfig,
  CLIStateConfigUpdatePayload,
  CliToolDefinition,
  CliToolDescriptionRecord,
  CliToolsCatalogResponse,
  CliToolsDescribeOptionsResponse,
  CliToolsInstalledResponse,
  CustomCliTool,
} from "./types";

const CLI_TOOLS_ERROR_KEYS = {
  loadFailed: "settings.cliTools.errors.loadFailed",
  saveFailed: "settings.cliTools.errors.saveFailed",
} as const;

export async function loadCLIConfig(): Promise<CLIConfig> {
  const response = await fetch(`${getBackendBaseURL()}/api/cli/catalog`);
  if (!response.ok) {
    throw new Error(`${CLI_TOOLS_ERROR_KEYS.loadFailed}::${response.status}`);
  }
  const payload = (await response.json()) as { clis?: Record<string, CLIStateConfig> };
  return {
    clis: payload.clis ?? {},
  };
}

export async function updateCLIConfigItem(
  cliId: string,
  payload: CLIStateConfigUpdatePayload,
): Promise<CLIStateConfig> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/cli/catalog/${encodeURIComponent(cliId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    throw new Error(`${CLI_TOOLS_ERROR_KEYS.saveFailed}::${response.status}`);
  }
  return (await response.json()) as CLIStateConfig;
}

export async function loadCliToolsCatalog(): Promise<CliToolDefinition[]> {
  const response = await fetch(`${getBackendBaseURL()}/api/cli-tools/catalog`);
  if (!response.ok) {
    throw new Error(`${CLI_TOOLS_ERROR_KEYS.loadFailed}::${response.status}`);
  }
  const payload = (await response.json()) as CliToolsCatalogResponse;
  return payload.tools ?? [];
}

export async function loadCliToolsInstalled(): Promise<CliToolsInstalledResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/cli-tools/installed`);
  if (!response.ok) {
    throw new Error(`${CLI_TOOLS_ERROR_KEYS.loadFailed}::${response.status}`);
  }
  return (await response.json()) as CliToolsInstalledResponse;
}

export async function loadCliToolsDescribeOptions(): Promise<CliToolsDescribeOptionsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/cli-tools/describe-options`);
  if (!response.ok) {
    throw new Error(`${CLI_TOOLS_ERROR_KEYS.loadFailed}::${response.status}`);
  }
  return (await response.json()) as CliToolsDescribeOptionsResponse;
}

export async function createCustomCliTool(payload: {
  binPath: string;
  name?: string;
}): Promise<CustomCliTool> {
  const response = await fetch(`${getBackendBaseURL()}/api/cli-tools/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail || `${CLI_TOOLS_ERROR_KEYS.saveFailed}::${response.status}`);
  }
  const result = (await response.json()) as { tool: CustomCliTool };
  return result.tool;
}

export async function deleteCustomCliTool(toolId: string): Promise<void> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/cli-tools/custom/${encodeURIComponent(toolId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail || `${CLI_TOOLS_ERROR_KEYS.saveFailed}::${response.status}`);
  }
}

export async function describeCliTool(
  toolId: string,
  payload: { providerId?: string; model?: string },
): Promise<CliToolDescriptionRecord> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/cli-tools/${encodeURIComponent(toolId)}/describe`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail || `${CLI_TOOLS_ERROR_KEYS.saveFailed}::${response.status}`);
  }
  const result = (await response.json()) as { description: CliToolDescriptionRecord };
  return result.description;
}

export async function migrateCliToolDescriptions(
  descriptions: Record<string, { zh: string; en: string }>,
): Promise<number> {
  const response = await fetch(`${getBackendBaseURL()}/api/cli-tools/descriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ descriptions }),
  });
  if (!response.ok) {
    throw new Error(`${CLI_TOOLS_ERROR_KEYS.saveFailed}::${response.status}`);
  }
  const result = (await response.json()) as { migrated: number };
  return result.migrated;
}
