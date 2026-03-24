import { getBackendBaseURL } from "@/core/config";

import type { CLIConfig, CLIStateConfig } from "./types";

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

