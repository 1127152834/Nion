"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type GuardianModeStatus = "standing_by" | "busy" | "offline";

const STATUS_COPY: Record<
  GuardianModeStatus,
  {
    label: string;
    description: string;
    tone: string;
  }
> = {
  standing_by: {
    label: "Standing by",
    description: "Guardian mode is running and ready to keep remote entry available.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  busy: {
    label: "Busy",
    description: "Guardian mode is actively handling runtime work right now.",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  offline: {
    label: "Offline",
    description: "Guardian mode is not currently reachable from the desktop runtime.",
    tone: "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
  },
};

export function GuardianModeStatusCard({
  status,
}: {
  status: GuardianModeStatus;
}) {
  const copy = STATUS_COPY[status];

  return (
    <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Guardian mode</div>
          <div className="text-muted-foreground text-sm">{copy.description}</div>
        </div>
        <Badge
          variant="outline"
          className={cn("rounded-full border px-3 py-1 text-xs", copy.tone)}
        >
          {copy.label}
        </Badge>
      </div>
    </div>
  );
}
