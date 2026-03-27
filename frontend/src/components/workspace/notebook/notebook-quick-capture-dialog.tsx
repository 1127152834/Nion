"use client";

import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-0 text-[var(--notebook-ink)] shadow-xl sm:max-w-3xl"
      >
        <div className="flex items-center border-b border-[var(--notebook-border)] bg-[var(--notebook-sidebar)] px-4 py-3">
          <Sparkles className="mr-2 size-4 text-[var(--notebook-ink)]" />
          <span className="text-sm font-medium text-[var(--notebook-ink)]">{quickCaptureLabel}</span>
          <span className="ml-auto text-xs text-[var(--notebook-soft-text)]">按 Cmd+Enter 保存至收件箱</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-4 text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]"
          >
            <X className="size-4" />
          </button>
        </div>
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
      </DialogContent>
    </Dialog>
  );
}
