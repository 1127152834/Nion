"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type WorkspacePageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function WorkspacePageHeader({
  title,
  description,
  action,
  className,
  titleClassName,
  descriptionClassName,
}: WorkspacePageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between border-b px-6 py-4", className)}>
      <div className="min-w-0">
        <h1 className={cn("text-xl font-semibold", titleClassName)}>{title}</h1>
        {description ? (
          <p className={cn("text-muted-foreground mt-0.5 text-sm", descriptionClassName)}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
