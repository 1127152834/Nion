"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/core/i18n/hooks";

export type MemorySurfaceKey = "provider" | "console" | "agent-core";

export function MemorySurfaceTabs(props: {
  value: MemorySurfaceKey;
  onChange: (value: MemorySurfaceKey) => void;
}) {
  const { t } = useI18n();

  return (
    <Tabs value={props.value} onValueChange={(value) => props.onChange(value as MemorySurfaceKey)}>
      <TabsList variant="line">
        <TabsTrigger value="provider">
          {t.settings.memory.surfaces.provider.title}
        </TabsTrigger>
        <TabsTrigger value="console">
          {t.settings.memory.surfaces.console.title}
        </TabsTrigger>
        <TabsTrigger value="agent-core">
          {t.settings.memory.surfaces.agentCore.title}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
