"use client";

import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { notebookThemeStyle } from "./notebook-theme";

type NotebookDialogShellProps = {
  children: ReactNode;
  contentClassName?: string;
  headerAccessory?: ReactNode;
  icon?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
};

export function NotebookDialogShell({
  children,
  contentClassName,
  headerAccessory,
  icon,
  open,
  onOpenChange,
  title,
}: NotebookDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "gap-0 overflow-hidden border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-0 text-[var(--notebook-ink)] shadow-xl",
          contentClassName,
        )}
        style={notebookThemeStyle}
      >
        <div className="flex items-center justify-between border-b border-[var(--notebook-border)] px-6 py-4">
          <div className="flex items-center text-lg font-semibold text-[var(--notebook-ink)]">
            {icon ? <span className="mr-2 text-[var(--notebook-soft-text)]">{icon}</span> : null}
            {title}
          </div>
          <div className="flex items-center gap-3">
            {headerAccessory}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]"
            >
              <XIcon className="size-5" />
            </button>
          </div>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
