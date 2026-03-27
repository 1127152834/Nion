"use client";

import { Sparkles, X } from "lucide-react";

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
        <div className="flex items-center border-b border-[#E5E5E5] bg-[#F9F9F8] px-4 py-3">
          <Sparkles className="mr-2 size-4 text-[#1A1A1A]" />
          <span className="text-sm font-medium text-[#1A1A1A]">{quickCaptureLabel}</span>
          <span className="ml-auto text-xs text-[#8C8C8C]">按 Cmd+Enter 保存至收件箱</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-4 text-[#8C8C8C] transition-colors hover:text-[#1A1A1A]"
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
            placeholder={quickCaptureHint || quickCaptureDescription}
            className="min-h-52 rounded-none border-0 focus-visible:ring-0"
          />
          <div className="flex justify-end border-t border-[#E5E5E5] bg-[#F9F9F8] px-4 py-3">
            <Button onClick={onSubmit} disabled={!value.trim() || pending}>
              {pending ? savingLabel : saveLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
