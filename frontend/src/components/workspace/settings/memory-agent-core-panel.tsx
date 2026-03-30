"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AutoDreamRunResponse } from "@/core/autodream/types";
import { useI18n } from "@/core/i18n/hooks";

export function MemoryAgentCorePanel(props: {
  dreamQuery: string;
  onDreamQueryChange: (value: string) => void;
  onRunAutoDream: () => void;
  runAutoDreamPending: boolean;
  runAutoDreamData: AutoDreamRunResponse | null;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border bg-background/80 p-5 shadow-sm">
      <h3 className="text-base font-medium">
        {t.settings.memory.surfaces.agentCore.title}
      </h3>
      <p className="text-muted-foreground mt-1 text-sm">
        {t.settings.memory.surfaces.agentCore.description}
      </p>

      <div className="mt-5 space-y-5">
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">
                {t.settings.memory.autodream.title}
              </h4>
              <p className="text-muted-foreground text-sm">
                {t.settings.memory.autodream.description}
              </p>
            </div>
            <Badge variant="secondary">
              {props.runAutoDreamData?.agent_memory_updates.length ?? 0}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder={t.settings.memory.autodream.runPlaceholder}
              value={props.dreamQuery}
              onChange={(event) => props.onDreamQueryChange(event.target.value)}
            />
            <Button
              disabled={props.runAutoDreamPending}
              onClick={props.onRunAutoDream}
            >
              {t.settings.memory.autodream.runButton}
            </Button>
          </div>

          {props.runAutoDreamData ? (
            <div className="rounded-md border bg-background p-3 text-sm leading-6">
              <div className="mb-2 font-medium">
                {props.runAutoDreamData.entry.summary ||
                  t.settings.memory.autodream.emptySummary}
              </div>
              <div className="text-muted-foreground text-xs">
                {props.runAutoDreamData.entry_path}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="hidden">
        {String(Boolean(props.runAutoDreamData?.action_proposals))}
      </div>
    </div>
  );
}
