"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfSelfMaintenance } from "@/core/navigation/desktop-routes";
import type { SelfMaintenanceRunResponse } from "@/core/self-maintenance";

export function MemoryAgentCorePanel(props: {
  runSelfMaintenanceData: SelfMaintenanceRunResponse | null;
}) {
  const { t } = useI18n();
  const hasRecentRun = Boolean(props.runSelfMaintenanceData?.entry.summary);
  const summary = hasRecentRun
    ? props.runSelfMaintenanceData?.entry.summary
    : t.settings.memory.selfMaintenance.supportingSummary;
  const proposalCount = hasRecentRun
    ? (props.runSelfMaintenanceData?.memory_update_proposals.length ?? 0) +
      (props.runSelfMaintenanceData?.prune_proposals.length ?? 0) +
      (props.runSelfMaintenanceData?.action_proposals.length ?? 0) +
      (props.runSelfMaintenanceData?.self_upgrade_proposals.length ?? 0)
    : null;

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
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">
                {t.settings.memory.selfMaintenance.title}
              </h4>
              <p className="text-muted-foreground text-sm">
                {t.settings.memory.selfMaintenance.description}
              </p>
            </div>
            {proposalCount !== null ? (
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t.settings.memory.selfMaintenance.proposalsLabel}
                </div>
                <div className="mt-1 text-lg font-semibold">{proposalCount}</div>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border bg-background p-3 text-sm leading-6">
            <div className="font-medium">{summary}</div>
            {hasRecentRun ? (
              <div className="mt-2 text-xs text-muted-foreground">
                {props.runSelfMaintenanceData?.entry_path ||
                  t.settings.memory.selfMaintenance.noEntryPath}
              </div>
            ) : null}
          </div>

          {hasRecentRun && props.runSelfMaintenanceData?.entry.trigger ? (
            <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
              <div>
                <div className="font-medium uppercase tracking-wide">
                  {t.settings.memory.selfMaintenance.triggerLabel}
                </div>
                <div className="mt-1">{props.runSelfMaintenanceData.entry.trigger}</div>
              </div>
              <div>
                <div className="font-medium uppercase tracking-wide">
                  {t.settings.memory.selfMaintenance.latestRunLabel}
                </div>
                <div className="mt-1">
                  {props.runSelfMaintenanceData.entry_path}
                </div>
              </div>
            </div>
          ) : null}

          <Button asChild variant="outline" className="w-full">
            <Link href={pathOfSelfMaintenance()}>
              {t.settings.memory.selfMaintenance.openPageButton}
            </Link>
          </Button>
        </section>
      </div>

      <div className="hidden">
        {String(Boolean(props.runSelfMaintenanceData?.entry_path))}
      </div>
    </div>
  );
}
