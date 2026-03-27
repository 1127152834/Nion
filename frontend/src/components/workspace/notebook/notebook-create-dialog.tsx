"use client";

import { FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { NotebookDirectoryOption } from "@/core/notebook";
import { Textarea } from "@/components/ui/textarea";
import { NotebookFolderPicker } from "./notebook-folder-picker";

type NotebookCreateDialogCopy = {
  cancel: string;
  createDialogDescription: string;
  createDialogTitle: string;
  createNote: string;
  emptyDescription: string;
  folderPickerEmpty: string;
  noteTitlePlaceholder: string;
  saveToLabel: string;
  selectFolderPlaceholder: string;
  saving: string;
};

type NotebookCreateDialogProps = {
  body: string;
  copy: NotebookCreateDialogCopy;
  directory: string;
  directoryOptions: NotebookDirectoryOption[];
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
  directoryOptions,
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
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-0 text-[var(--notebook-ink)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--notebook-border)] px-6 py-4">
          <div className="flex items-center text-lg font-semibold text-[var(--notebook-ink)]">
            <FileText className="mr-2 size-5" />
            {copy.createDialogTitle}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--notebook-soft-text)]">标题</label>
            <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={copy.noteTitlePlaceholder}
              className="border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] placeholder:text-[var(--notebook-soft-text)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--notebook-soft-text)]">
              {copy.saveToLabel}
            </label>
            <NotebookFolderPicker
              emptyLabel={copy.folderPickerEmpty}
              options={directoryOptions}
              placeholder={copy.selectFolderPlaceholder}
              value={directory}
              onValueChange={onDirectoryChange}
            />
          </div>
          <Textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={copy.createDialogDescription}
            className="min-h-40 border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] placeholder:text-[var(--notebook-soft-text)]"
          />
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
