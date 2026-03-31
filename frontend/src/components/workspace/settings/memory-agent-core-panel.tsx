"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";
import type { SelfMaintenanceRunResponse } from "@/core/self-maintenance";

export function MemoryAgentCorePanel(props: {
  dreamQuery: string;
  onDreamQueryChange: (value: string) => void;
  onRunSelfMaintenance: () => void;
  runSelfMaintenancePending: boolean;
  runSelfMaintenanceData: SelfMaintenanceRunResponse | null;
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
                {t.settings.memory.selfMaintenance.title}
              </h4>
              <p className="text-muted-foreground text-sm">
                {t.settings.memory.selfMaintenance.description}
              </p>
            </div>
            <Badge variant="secondary">
              {props.runSelfMaintenanceData?.memory_update_proposals.length ?? 0}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder={t.settings.memory.selfMaintenance.runPlaceholder}
              value={props.dreamQuery}
              onChange={(event) => props.onDreamQueryChange(event.target.value)}
            />
            <Button
              disabled={props.runSelfMaintenancePending}
              onClick={props.onRunSelfMaintenance}
            >
              {t.settings.memory.selfMaintenance.runButton}
            </Button>
          </div>

          {props.runSelfMaintenanceData ? (
            <div className="space-y-3 rounded-md border bg-background p-3 text-sm leading-6">
              <div>
                <div className="mb-2 font-medium">
                  {props.runSelfMaintenanceData.entry.summary ||
                    t.settings.memory.selfMaintenance.emptySummary}
                </div>
                <div className="text-muted-foreground text-xs">
                  {props.runSelfMaintenanceData.entry_path}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide">
                    {t.settings.memory.selfMaintenance.memoryUpdates}
                  </div>
                  <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
                    {(props.runSelfMaintenanceData.memory_update_proposals.length
                      ? props.runSelfMaintenanceData.memory_update_proposals
                      : [t.settings.memory.selfMaintenance.emptyList]
                    ).map((item) => (
                      <li key={`memory-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide">
                    {t.settings.memory.selfMaintenance.pruneProposals}
                  </div>
                  <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
                    {(props.runSelfMaintenanceData.prune_proposals.length
                      ? props.runSelfMaintenanceData.prune_proposals
                      : [t.settings.memory.selfMaintenance.emptyList]
                    ).map((item) => (
                      <li key={`prune-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide">
                    {t.settings.memory.selfMaintenance.actionProposals}
                  </div>
                  <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
                    {(props.runSelfMaintenanceData.action_proposals.length
                      ? props.runSelfMaintenanceData.action_proposals
                      : [t.settings.memory.selfMaintenance.emptyList]
                    ).map((item) => (
                      <li key={`action-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide">
                    {t.settings.memory.selfMaintenance.selfUpgradeProposals}
                  </div>
                  <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
                    {(props.runSelfMaintenanceData.self_upgrade_proposals.length
                      ? props.runSelfMaintenanceData.self_upgrade_proposals
                      : [t.settings.memory.selfMaintenance.emptyList]
                    ).map((item) => (
                      <li key={`upgrade-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="hidden">
        {String(Boolean(props.runSelfMaintenanceData?.action_proposals))}
      </div>
    </div>
  );
}
