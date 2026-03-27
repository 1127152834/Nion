"use client";

import { AlertTriangle } from "lucide-react";

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
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F0]">
            <AlertTriangle className="size-6 text-[#F5222D]" />
          </div>

          <DialogHeader>
            <DialogTitle className="text-center">{title}</DialogTitle>
            <DialogDescription className="text-center">{description}</DialogDescription>
          </DialogHeader>

          {summary ? (
            <div className="mt-6 rounded-lg border border-[#E5E5E5] bg-[#F9F9F8] p-3">
              <div className="mb-1 text-xs text-[#8C8C8C]">路径 / 内容预览</div>
              <div className="line-clamp-2 text-sm italic text-[#1A1A1A]">{summary}</div>
            </div>
          ) : null}

          <div className="mb-6 mt-6 flex items-center justify-center text-center text-xs text-[#8C8C8C]">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#52C41A]" />
            不用担心，删除后您仍可以在回收站中恢复它。
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
