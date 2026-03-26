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
import { Textarea } from "@/components/ui/textarea";

type NotebookQuickCaptureDialogProps = {
  cancelLabel: string;
  open: boolean;
  pending: boolean;
  quickCaptureDescription: string;
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
  cancelLabel,
  open,
  pending,
  quickCaptureDescription,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{quickCaptureLabel}</DialogTitle>
          <DialogDescription>{quickCaptureDescription}</DialogDescription>
        </DialogHeader>
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
          className="min-h-52"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button onClick={onSubmit} disabled={!value.trim() || pending}>
            {pending ? savingLabel : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
