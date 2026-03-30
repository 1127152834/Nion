"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/core/i18n/hooks";
import { useMemoryProviderFamilies, useMemoryProviderState } from "@/core/memory-os/hooks";
import {
  describeOpenVikingMode,
  getActiveOpenVikingProvider,
} from "@/core/memory-os/openviking-mode";

export function MemoryProviderFoundationCard() {
  const { t } = useI18n();
  const families = useMemoryProviderFamilies();
  const state = useMemoryProviderState();
  const activeOpenVikingProvider = getActiveOpenVikingProvider(
    state.data?.providers ?? [],
    state.data?.active_provider_id ?? null,
  );
  const openVikingMode = describeOpenVikingMode(
    (activeOpenVikingProvider?.config as { mode?: string; base_url?: string }) ?? {
      mode: "embedded",
    },
  );

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
          <Badge key={family.family} variant={family.family === state.data?.active_provider_family ? "default" : "secondary"}>
            {family.display_name}
          </Badge>
        ))}
      </div>

      <div className="text-muted-foreground mt-4 text-xs">
        {t.settings.memory.surfaces.provider.modeSummary}
      </div>

      <div className="text-muted-foreground mt-2 text-xs">
        {t.settings.memory.surfaces.provider.activeModeLabel}: {openVikingMode}
      </div>
    </div>
  );
}
