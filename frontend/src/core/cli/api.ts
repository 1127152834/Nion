import { getBackendBaseURL } from "@/core/config";

import type {
  CLIConfig,
  CLIStateConfig,
  CLIStateConfigUpdatePayload,
} from "./types";

export async function loadCLIConfig(): Promise<CLIConfig> {
  const response = await fetch(`${getBackendBaseURL()}/api/cli/catalog`);
  if (!response.ok) {
    throw new Error(`Failed to load CLI catalog (${response.status})`);
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
    throw new Error(`Failed to update CLI catalog item (${response.status})`);
  }
  return (await response.json()) as CLIStateConfig;
}
