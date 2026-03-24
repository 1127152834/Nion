"use client";

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
};

export function AutomationHistorySection({
  runs,
}: AutomationHistorySectionProps) {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.sections;
  const stateLabels = t.settings.automation.stateLabels;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{copy.historyTitle}</h2>
        <p className="text-muted-foreground text-sm">{copy.historyDescription}</p>
      </div>
      {runs.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
          {copy.emptyHistory}
        </div>
      ) : (
        <ItemGroup className="gap-3">
          {runs.map((run) => (
            <Item
              key={run.id}
              variant="outline"
              className="items-start gap-4 rounded-xl"
            >
              <ItemContent className="w-full">
                <ItemHeader className="items-start">
                  <div className="space-y-2">
                    <ItemTitle>
                      <span>{run.id}</span>
                      <Badge
                        variant={
                          run.status === "failed" ? "destructive" : "secondary"
                        }
                      >
                        {stateLabels[run.status] ?? run.status}
                      </Badge>
                    </ItemTitle>
                    <ItemDescription>
                      {run.result_summary || copy.noSummary}
                    </ItemDescription>
                  </div>
                </ItemHeader>
                <div className="text-muted-foreground grid gap-3 pt-3 text-xs md:grid-cols-3">
                  <div>
                    <div className="font-medium text-foreground/80">
                      {copy.startedLabel}
                    </div>
                    <div>{run.started_at}</div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/80">
                      {copy.finishedLabel}
                    </div>
                    <div>{run.finished_at ?? copy.runningLabel}</div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/80">
                      {copy.jobLabel}
                    </div>
                    <div>{run.job_id}</div>
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
