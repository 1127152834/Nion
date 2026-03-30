import type { MemoryProviderInstance } from "./types";

export function describeOpenVikingMode(provider: {
  mode?: string;
  base_url?: string;
}) {
  if (provider.mode === "remote") {
    return "Remote OpenViking";
  }
  return "Embedded OpenViking";
}

export function getActiveOpenVikingProvider(
  providers: MemoryProviderInstance[],
  activeProviderId: string | null,
) {
  if (!activeProviderId) return null;
  return providers.find((provider) => provider.id === activeProviderId) ?? null;
}
