import { getBackendBaseURL } from "@/core/config";

import type { SoulConsoleMutationResult, SoulConsoleResponse } from "./types";

export async function loadSoulConsole(): Promise<SoulConsoleResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/soul`);
  if (!response.ok) {
    throw new Error(`Failed to load soul console (${response.status})`);
  }
  return (await response.json()) as SoulConsoleResponse;
}

export async function editSoulLayer(
  layer: "relationship_stance" | "adaptive_overlay",
  summary: string,
): Promise<SoulConsoleMutationResult> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/soul/${encodeURIComponent(layer)}/edit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ summary }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to edit soul layer (${response.status})`);
  }
  return (await response.json()) as SoulConsoleMutationResult;
}

export async function rollbackSoulOverlay(): Promise<SoulConsoleMutationResult> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/soul/adaptive_overlay/rollback`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`Failed to rollback soul overlay (${response.status})`);
  }
  return (await response.json()) as SoulConsoleMutationResult;
}

export async function freezeSoulLayerAutoEvolution(
  layer:
    | "constitution"
    | "identity_narrative"
    | "relationship_stance"
    | "adaptive_overlay",
): Promise<SoulConsoleMutationResult> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/soul/${encodeURIComponent(layer)}/freeze-auto-evolution`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`Failed to freeze soul layer (${response.status})`);
  }
  return (await response.json()) as SoulConsoleMutationResult;
}
