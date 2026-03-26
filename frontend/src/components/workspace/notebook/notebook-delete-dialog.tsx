"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NotebookDeleteDialogProps = {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  open: boolean;
  summary: string | null;
  title: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function NotebookDeleteDialog({
  cancelLabel,
  confirmLabel,
  description,
  open,
  summary,
  title,
  onConfirm,
  onOpenChange,
}: NotebookDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {summary ? (
          <div className="bg-muted/40 rounded-lg border p-3 text-sm leading-6">
            {summary}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
