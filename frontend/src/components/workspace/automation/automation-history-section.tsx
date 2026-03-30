"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import type { AutomationRun } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type AutomationHistorySectionProps = {
  runs: AutomationRun[];
  highlightedRunId?: string | null;
};

export function AutomationHistorySection({
  runs,
  highlightedRunId,
}: AutomationHistorySectionProps) {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.sections;
  const stateLabels = t.settings.automation.stateLabels;
  const [filter, setFilter] = useState<"all" | "failed" | "succeeded">("all");
  const filteredRuns = useMemo(() => {
    if (filter === "all") {
      return runs;
    }
    return runs.filter((run) => run.status === filter);
  }, [filter, runs]);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">{copy.historyTitle}</h2>
        <p className="text-sm leading-6 text-stone-500">{copy.historyDescription}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "failed", "succeeded"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={
              filter === value
                ? "rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-sm text-white shadow-xs"
                : "rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-sm text-stone-500"
            }
            onClick={() => setFilter(value)}
          >
            {copy.historyFilters[value]}
          </button>
        ))}
      </div>
      {filteredRuns.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-stone-200 bg-stone-50/70 p-6 text-sm text-stone-500">
          {copy.emptyHistory}
        </div>
      ) : (
        <ItemGroup className="gap-4">
          {filteredRuns.map((run) => (
            <Item
              key={run.id}
              id={`run-${run.id}`}
              variant="outline"
              className={
                run.id === highlightedRunId
                  ? "items-start gap-4 rounded-[24px] border-stone-900/20 bg-[linear-gradient(180deg,rgba(255,248,237,0.96),rgba(248,243,233,0.92))] p-1 shadow-[0_16px_40px_rgba(98,74,37,0.1)]"
                  : "items-start gap-4 rounded-[24px] border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(248,243,233,0.9))] p-1 shadow-[0_16px_40px_rgba(98,74,37,0.08)]"
              }
            >
              <ItemContent className="w-full rounded-[20px] bg-white/75 p-4">
                <ItemHeader className="items-start">
                  <div className="space-y-2">
                    <ItemTitle className="flex flex-wrap items-center gap-2 text-stone-900">
                      <span>{run.id}</span>
                      <Badge
                        className="rounded-full"
                        variant={
                          run.status === "failed" ? "destructive" : "secondary"
                        }
                      >
                        {stateLabels[run.status] ?? run.status}
                      </Badge>
                    </ItemTitle>
                    <ItemDescription className="text-sm text-stone-500">
                      {run.result_summary || copy.noSummary}
                    </ItemDescription>
                  </div>
                </ItemHeader>
                <div className="grid gap-3 pt-4 text-xs md:grid-cols-3">
                  <div>
                    <div className="font-medium uppercase tracking-[0.16em] text-stone-400">
                      {copy.startedLabel}
                    </div>
                    <div className="mt-2 text-sm text-stone-700">{run.started_at}</div>
                  </div>
                  <div>
                    <div className="font-medium uppercase tracking-[0.16em] text-stone-400">
                      {copy.finishedLabel}
                    </div>
                    <div className="mt-2 text-sm text-stone-700">{run.finished_at ?? copy.runningLabel}</div>
                  </div>
                  <div>
                    <div className="font-medium uppercase tracking-[0.16em] text-stone-400">
                      {copy.jobLabel}
                    </div>
                    <div className="mt-2 text-sm text-stone-700">{run.job_id}</div>
                  </div>
                </div>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      )}
    </section>
  );
}
