"use client";

import { Badge } from "@/components/ui/badge";
import { useMemoryProviderFamilies, useMemoryProviderState } from "@/core/memory-os/hooks";

export function MemoryProviderFoundationCard() {
  const families = useMemoryProviderFamilies();
  const state = useMemoryProviderState();

  return (
    <div className="rounded-xl border bg-background/80 p-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-base font-medium">Memory Provider</h3>
        <p className="text-muted-foreground text-sm">
          Choose the active memory backend that powers notebook, memory, AutoDream, identity, and soul.
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
        OpenViking modes: embedded / remote
      </div>
    </div>
  );
}
