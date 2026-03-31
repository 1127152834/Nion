"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/core/i18n/hooks";
import {
  resolveActiveMemoryProviderSummary,
  useMemoryProviderFamilies,
  useMemoryProviderState,
} from "@/core/memory-os/hooks";
import type {
  MemoryProviderCapabilities,
  MemoryProviderCapabilitySupport,
} from "@/core/memory-os/types";

function countCapabilities(
  capabilities: MemoryProviderCapabilities,
): Record<MemoryProviderCapabilitySupport, number> {
  const counts = {
    supported: 0,
    partial: 0,
    unsupported: 0,
  } satisfies Record<MemoryProviderCapabilitySupport, number>;

  for (const value of Object.values(capabilities)) {
    counts[value] += 1;
  }

  return counts;
}

function formatCapabilitySummary(capabilities: MemoryProviderCapabilities) {
  const counts = countCapabilities(capabilities);
  return `supported ${counts.supported} / partial ${counts.partial} / unsupported ${counts.unsupported}`;
}

function formatRuntimeMode(runtimeMode: string) {
  if (!runtimeMode || runtimeMode === "unknown") {
    return "Unknown";
  }
  return runtimeMode;
}

function formatHealthLabel(health: string) {
  if (!health) {
    return "unknown";
  }
  return health;
}

export function MemoryProviderFoundationCard() {
  const { t } = useI18n();
  const families = useMemoryProviderFamilies();
  const state = useMemoryProviderState();
  const activeProvider = resolveActiveMemoryProviderSummary({
    families: families.data?.families ?? [],
    state: state.data,
  });
  const capabilitySummary = activeProvider
    ? formatCapabilitySummary(activeProvider.capabilities)
    : null;
  const runtimeSummary = activeProvider?.status_summary?.summary?.trim() || null;

  return (
    <div className="rounded-xl border bg-background/80 p-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-base font-medium">
          {t.settings.memory.surfaces.provider.title}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t.settings.memory.surfaces.provider.description}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(families.data?.families ?? []).map((family) => (
          <Badge
            key={family.family}
            variant={
              family.family === state.data?.active_provider_family
                ? "default"
                : "secondary"
            }
          >
            {family.display_name}
          </Badge>
        ))}
      </div>

      <div className="mt-4 grid gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Current provider family:</span>
          <span className="font-medium">
            {activeProvider?.display_name ?? state.data?.active_provider_family ?? "Unknown"}
          </span>
          <Badge variant={activeProvider?.health === "healthy" ? "default" : "outline"}>
            {formatHealthLabel(activeProvider?.health ?? "unknown")}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Current mode:</span>
          <span className="font-medium">
            {formatRuntimeMode(activeProvider?.runtime_mode ?? "unknown")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Capability summary:</span>
          <span className="font-medium">{capabilitySummary ?? "Unknown"}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Runtime status:</span>
          <span className="font-medium">
            {runtimeSummary ?? "Runtime status unavailable"}
          </span>
        </div>
      </div>
    </div>
  );
}
