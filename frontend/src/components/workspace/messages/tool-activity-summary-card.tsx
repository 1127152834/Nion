import { WrenchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ToolActivitySummaryCard({
  summaryLabel,
  toolNames,
  resultClass,
  className,
}: {
  summaryLabel: string;
  toolNames: string[];
  resultClass?: string;
  className?: string;
}) {
  const accentClass =
    resultClass === "read"
      ? "border-sky-200/70 bg-sky-50/70"
      : resultClass === "search"
        ? "border-amber-200/70 bg-amber-50/70"
        : resultClass === "subtask"
          ? "border-emerald-200/70 bg-emerald-50/70"
          : resultClass === "shell"
            ? "border-violet-200/70 bg-violet-50/70"
            : "border-border bg-muted/40";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        accentClass,
        className,
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span>{summaryLabel}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {toolNames.length} tool calls
      </div>
      {toolNames.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {toolNames.map((toolName, index) => (
            <span
              key={`${toolName}-${index}`}
              className="rounded bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {toolName}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
