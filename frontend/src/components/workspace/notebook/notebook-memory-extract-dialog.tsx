"use client";

import { Brain } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { NotebookDialogShell } from "./notebook-dialog-shell";

type NotebookMemoryExtractDialogCopy = {
  cancel: string;
  defaultHint: string;
  description: string;
  instructionLabel: string;
  instructionPlaceholder: string;
  submit: string;
  submitting: string;
  title: string;
};

type NotebookMemoryExtractDialogProps = {
  copy: NotebookMemoryExtractDialogCopy;
  instruction: string;
  open: boolean;
  pending: boolean;
  onInstructionChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
};

export function NotebookMemoryExtractDialog({
  copy,
  instruction,
  open,
  pending,
  onInstructionChange,
  onOpenChange,
  onSubmit,
}: NotebookMemoryExtractDialogProps) {
  return (
    <NotebookDialogShell
      icon={<Brain className="size-5" />}
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
    >
      <div className="space-y-4 p-6">
        <p className="text-sm leading-relaxed text-[var(--notebook-soft-text)]">
          {copy.description}
        </p>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--notebook-soft-text)]">
            {copy.instructionLabel}
          </label>
          <Textarea
            value={instruction}
            onChange={(event) => onInstructionChange(event.target.value)}
            placeholder={copy.instructionPlaceholder}
            className="min-h-28 border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] placeholder:text-[var(--notebook-soft-text)]"
          />
          <p className="text-xs leading-relaxed text-[var(--notebook-soft-text)]">
            {copy.defaultHint}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] hover:bg-[var(--notebook-hover)]"
            onClick={() => onOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            className="bg-[var(--notebook-brand)] text-[var(--notebook-panel)] hover:opacity-90"
            disabled={pending}
            onClick={onSubmit}
          >
            {pending ? copy.submitting : copy.submit}
          </Button>
        </DialogFooter>
      </div>
    </NotebookDialogShell>
  );
}
