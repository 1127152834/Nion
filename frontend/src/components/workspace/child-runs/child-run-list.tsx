import type { ChildRunRecord } from "@/core/child-runs/types";

export function ChildRunList({
  childRuns,
  onSelect,
}: {
  childRuns: ChildRunRecord[];
  onSelect?: (childRun: ChildRunRecord) => void;
}) {
  if (childRuns.length === 0) return null;

  return (
    <div className="mt-2 ml-2 flex flex-col gap-1 border-l border-border/35 pl-2">
      {childRuns.map((childRun) => (
        <button
          key={childRun.child_run_id}
          type="button"
          className="rounded-lg border border-border/45 px-2 py-2 text-xs"
          onClick={() => onSelect?.(childRun)}
        >
          <div className="font-medium">{childRun.title}</div>
          <div className="text-muted-foreground">{childRun.status}</div>
        </button>
      ))}
    </div>
  );
}
