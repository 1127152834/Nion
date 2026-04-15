"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type GuardianModeStatus = "standing_by" | "busy" | "offline";

export type GuardianModeStatusCardCopy = {
  title: string;
  labels: Record<GuardianModeStatus, string>;
  descriptions: Record<GuardianModeStatus, string>;
};

const STATUS_COPY: Record<
  GuardianModeStatus,
  {
    tone: string;
  }
> = {
  standing_by: {
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  busy: {
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  offline: {
    tone: "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
  },
};

export function GuardianModeStatusCard({
  copy,
  status,
}: {
  copy: GuardianModeStatusCardCopy;
  status: GuardianModeStatus;
}) {
  const statusTone = STATUS_COPY[status];

  return (
    <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">{copy.title}</div>
          <div className="text-muted-foreground text-sm">
            {copy.descriptions[status]}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("rounded-full border px-3 py-1 text-xs", statusTone.tone)}
        >
          {copy.labels[status]}
        </Badge>
      </div>
    </div>
  );
}
