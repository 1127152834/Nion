import { getBackendBaseURL } from "@/core/config";

import type { MCPConfig, MCPServerProbeResponse } from "./types";

function resolveErrorMessage(rawText: string, fallback: string): string {
  const text = rawText.trim();
  if (!text) {
    return fallback;
  }
  try {
    const payload = JSON.parse(text) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  } catch {
    // keep raw text
  }
  return text;
}

export async function loadMCPConfig(): Promise<MCPConfig> {
  const response = await fetch(`${getBackendBaseURL()}/api/mcp/config`);
  if (!response.ok) {
    const detail = resolveErrorMessage(
      await response.text(),
      `Failed to load MCP config (${response.status})`,
    );
    throw new Error(detail);
  }
  return response.json() as Promise<MCPConfig>;
}

export async function updateMCPConfig(config: MCPConfig): Promise<MCPConfig> {
  const response = await fetch(`${getBackendBaseURL()}/api/mcp/config`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    },
  );
  if (!response.ok) {
    const detail = resolveErrorMessage(
      await response.text(),
      `Failed to update MCP config (${response.status})`,
    );
    throw new Error(detail);
  }
  return response.json() as Promise<MCPConfig>;
}

export async function probeMCPServer(
  serverName: string,
): Promise<MCPServerProbeResponse> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/mcp/servers/${encodeURIComponent(serverName)}/probe`,
  );
  const payload = (await response.json().catch(() => null)) as
    | MCPServerProbeResponse
    | { detail?: string }
    | null;

  if (!response.ok) {
    const detail =
      payload && "detail" in payload && typeof payload.detail === "string"
        ? payload.detail
        : `Failed to probe MCP server (${response.status})`;
    throw new Error(detail);
  }

  return payload as MCPServerProbeResponse;
}
