"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NotebookDialogShell } from "./notebook-dialog-shell";

type NotebookQuickCaptureDialogProps = {
  destinationLabel: string;
  open: boolean;
  pending: boolean;
  quickCaptureHint: string;
  quickCaptureLabel: string;
  saveLabel: string;
  savingLabel: string;
  value: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
};

export function NotebookQuickCaptureDialog({
  destinationLabel,
  open,
  pending,
  quickCaptureHint,
  quickCaptureLabel,
  saveLabel,
  savingLabel,
  value,
  onOpenChange,
  onSubmit,
  onValueChange,
}: NotebookQuickCaptureDialogProps) {
  return (
    <NotebookDialogShell
      contentClassName="sm:max-w-3xl"
      headerAccessory={
        <span className="text-xs text-[var(--notebook-soft-text)]">
          按 Cmd+Enter 保存至收件箱
        </span>
      }
      icon={<Sparkles className="size-4" />}
      open={open}
      onOpenChange={onOpenChange}
      title={quickCaptureLabel}
    >
        <div className="flex flex-col">
          <Textarea
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder={quickCaptureHint}
            className="min-h-52 rounded-none border-0 bg-[var(--notebook-panel)] text-base text-[var(--notebook-ink)] focus-visible:ring-0 placeholder:text-[var(--notebook-soft-text)]"
          />
          <div className="flex items-center justify-between border-t border-[var(--notebook-border)] bg-[var(--notebook-sidebar)] px-4 py-3">
            <span className="text-xs text-[var(--notebook-soft-text)]">
              {destinationLabel}
            </span>
            <Button
              className="bg-[var(--notebook-brand)] text-[var(--notebook-panel)] hover:opacity-90"
              onClick={onSubmit}
              disabled={!value.trim() || pending}
            >
              {pending ? savingLabel : saveLabel}
            </Button>
          </div>
        </div>
    </NotebookDialogShell>
  );
}
