"use client";

import {
  BriefcaseBusinessIcon,
  ChevronsUpDownIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({
  className,
  buttonClassName,
  menuClassName: _menuClassName,
}: {
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
}) {
  const { t } = useI18n();

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-12 w-full justify-between rounded-[1.55rem] border-sidebar-border/70 bg-sidebar-accent/55 px-3.5 text-sidebar-foreground",
        className,
        buttonClassName,
      )}
    >
      <span className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-xl border border-border/70 bg-muted/50">
          <BriefcaseBusinessIcon className="size-4 text-muted-foreground" />
        </span>
        <span className="text-left">
          <span className="text-muted-foreground block text-[11px] font-medium uppercase tracking-[0.16em]">
            {t.breadcrumb.workspace}
          </span>
          <span className="block text-sm font-medium">Default</span>
        </span>
      </span>
      <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
    </Button>
  );
}
