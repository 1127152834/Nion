"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { LocalActionPlanApprovalRequest } from "@/core/threads";
import { cn } from "@/lib/utils";

export function LocalActionsReviewCard({
  permissionRequest,
  className,
  onDecision,
  isResolving = false,
}: {
  permissionRequest: LocalActionPlanApprovalRequest;
  className?: string;
  onDecision?: (decision: "allow" | "allow_session" | "deny") => void;
  isResolving?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const irreversibleCount = Number(
    permissionRequest.localActionPlan.irreversibleActionCount ?? 0,
  );
  const localActions = permissionRequest.localActionPlan.actions;

  return (
    <div
      className={cn(
        "border-border/70 bg-background/80 flex w-full flex-col gap-4 rounded-2xl border px-5 py-4 shadow-sm backdrop-blur-sm",
        className,
      )}
      data-local-actions-review-card
    >
      <div className="space-y-1">
        <div className="text-foreground text-sm font-semibold">
          {permissionRequest.reviewTitle ?? "Review local actions"}
        </div>
        <p className="text-foreground text-[15px] leading-7">
          {permissionRequest.reasonMessage ??
            "Nion wants to run controlled local actions on this computer."}
        </p>
        {permissionRequest.reviewSummary ? (
          <p className="text-muted-foreground text-sm leading-6">
            {permissionRequest.reviewSummary}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl border bg-muted/20 px-3 py-2">
          <div className="text-muted-foreground text-xs">Plan</div>
          <div className="font-medium">
            {String(permissionRequest.localActionPlan.planId ?? "pending")}
          </div>
        </div>
        <div className="rounded-xl border bg-muted/20 px-3 py-2">
          <div className="text-muted-foreground text-xs">Execution</div>
          <div className="font-medium">
            {String(permissionRequest.localActionPlan.executionId ?? "pending")}
          </div>
        </div>
        <div className="rounded-xl border bg-muted/20 px-3 py-2">
          <div className="text-muted-foreground text-xs">Irreversible</div>
          <div className="font-medium">{irreversibleCount}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-xs">
          {irreversibleCount > 0
            ? `${irreversibleCount} irreversible action(s) must be reviewed`
            : "No irreversible actions in this plan"}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-auto px-0 text-xs"
          onClick={() => setShowDetails((current) => !current)}
        >
          View details
        </Button>
      </div>
      {showDetails ? (
        <div className="space-y-2 rounded-xl border bg-muted/20 px-3 py-3 text-sm">
          {localActions.map((action, index) => {
            const item = action as {
              action_type?: string;
              target?: string;
              reversible?: boolean;
              risk_level?: string;
            };
            return (
              <div key={`${item.action_type ?? "action"}-${index}`} className="rounded-lg border px-3 py-2">
                <div className="font-medium">{item.action_type ?? "unknown action"}</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Target: {item.target ?? "n/a"}
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Risk: {item.risk_level ?? "unknown"} · irreversible: {item.reversible === false ? "yes" : "no"}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {permissionRequest.actions.map((action) => (
          <Button
            key={action.key}
            type="button"
            variant={action.key === "deny" ? "outline" : "default"}
            className="rounded-full"
            disabled={isResolving}
            onClick={() => onDecision?.(action.key)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
