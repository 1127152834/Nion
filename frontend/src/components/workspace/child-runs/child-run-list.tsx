"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ChildRunRecord } from "@/core/child-runs/types";

export function ChildRunList({
  childRuns,
  onSelect,
}: {
  childRuns: ChildRunRecord[];
  onSelect: (childRun: ChildRunRecord) => void;
}) {
  if (childRuns.length === 0) {
    return null;
  }

  return (
    <Collapsible defaultOpen className="mt-2 px-3 pb-3">
      <CollapsibleTrigger className="text-muted-foreground text-[11px] font-medium">
        子智能体会话 ({childRuns.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 flex flex-col gap-1">
        {childRuns.map((childRun) => (
          <button
            key={childRun.child_run_id}
            type="button"
            className="rounded-lg border border-border/60 bg-background/75 px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent/20"
            onClick={() => onSelect(childRun)}
          >
            <div className="font-medium">{childRun.title}</div>
            <div className="text-muted-foreground mt-1">{childRun.status}</div>
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
