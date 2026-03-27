"use client";

import { FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type NotebookCreateDialogCopy = {
  cancel: string;
  createDialogDescription: string;
  createDialogTitle: string;
  createNote: string;
  emptyDescription: string;
  noteDirectoryPlaceholder: string;
  noteTitlePlaceholder: string;
  saving: string;
};

type NotebookCreateDialogProps = {
  body: string;
  copy: NotebookCreateDialogCopy;
  directory: string;
  open: boolean;
  pending: boolean;
  title: string;
  onBodyChange: (value: string) => void;
  onDirectoryChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onTitleChange: (value: string) => void;
};

export function NotebookCreateDialog({
  body,
  copy,
  directory,
  open,
  pending,
  title,
  onBodyChange,
  onDirectoryChange,
  onOpenChange,
  onSubmit,
  onTitleChange,
}: NotebookCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
          <div className="flex items-center text-lg font-semibold text-[#1A1A1A]">
            <FileText className="mr-2 size-5" />
            {copy.createDialogTitle}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[#8C8C8C] transition-colors hover:text-[#1A1A1A]"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#595959]">标题</label>
            <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={copy.noteTitlePlaceholder}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#595959]">位置</label>
            <Input
              value={directory}
              onChange={(event) => onDirectoryChange(event.target.value)}
              placeholder={copy.noteDirectoryPlaceholder}
            />
          </div>
          <Textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={copy.emptyDescription}
            className="min-h-40"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!title.trim() || pending}
            >
              {pending ? copy.saving : copy.createNote}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
