"use client";

import { Button } from "@/components/ui/button";

export type LocalActionsPermissionMode =
  | "disabled"
  | "review_required"
  | "allow_all";

export function LocalActionsPermissionCard({
  value,
  onChange,
  copy,
}: {
  value: LocalActionsPermissionMode;
  onChange: (next: LocalActionsPermissionMode) => void;
  copy: {
    title: string;
    description: string;
    disabled: string;
    reviewRequired: string;
    allowAll: string;
  };
}) {
  return (
    <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="space-y-1">
        <div className="text-sm font-medium">{copy.title}</div>
        <div className="text-muted-foreground text-sm">{copy.description}</div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          type="button"
          variant={value === "disabled" ? "default" : "outline"}
          onClick={() => onChange("disabled")}
        >
          {copy.disabled}
        </Button>
        <Button
          type="button"
          variant={value === "review_required" ? "default" : "outline"}
          onClick={() => onChange("review_required")}
        >
          {copy.reviewRequired}
        </Button>
        <Button
          type="button"
          variant={value === "allow_all" ? "default" : "outline"}
          onClick={() => onChange("allow_all")}
        >
          {copy.allowAll}
        </Button>
      </div>
    </div>
  );
}
