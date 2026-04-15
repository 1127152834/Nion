"use client";

import type { LocalActionsHistoryItem } from "@/core/local-actions";

export function LocalActionsHistoryCard({
  items,
}: {
  items: LocalActionsHistoryItem[];
}) {
  return (
    <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="space-y-1">
        <div className="text-sm font-medium">Recent local actions</div>
        <div className="text-muted-foreground text-sm">
          Review the latest controlled local-action audits from guardian mode.
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.map(({ goal, plan, execution }) => (
          <div
            key={execution.execution_id}
            className="rounded-xl border bg-muted/20 px-3 py-3"
          >
            <div className="text-sm font-medium">{goal.user_input}</div>
            <div className="text-muted-foreground mt-1 text-xs">
              {plan.summary}
            </div>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
              <div>Risk: {plan.risk_level}</div>
              <div>Approval: {execution.approval_status}</div>
              <div>Status: {goal.status}</div>
            </div>
            <div className="text-muted-foreground mt-2 text-xs">
              {execution.audit_summary}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
