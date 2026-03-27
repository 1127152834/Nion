"use client";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { NotebookDirectoryOption } from "@/core/notebook";
import { NotebookDialogShell } from "./notebook-dialog-shell";
import { NotebookFolderPicker } from "./notebook-folder-picker";

type NotebookCreateDialogCopy = {
  cancel: string;
  createDialogDescription: string;
  createDialogTitle: string;
  confirmSaveDraft: string;
  folderPickerEmpty: string;
  noteTitlePlaceholder: string;
  saveToLabel: string;
  selectFolderPlaceholder: string;
  saving: string;
};

type NotebookCreateDialogProps = {
  copy: NotebookCreateDialogCopy;
  directory: string;
  directoryOptions: NotebookDirectoryOption[];
  open: boolean;
  pending: boolean;
  title: string;
  onDirectoryChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onTitleChange: (value: string) => void;
};

export function NotebookCreateDialog({
  copy,
  directory,
  directoryOptions,
  open,
  pending,
  title,
  onDirectoryChange,
  onOpenChange,
  onSubmit,
  onTitleChange,
}: NotebookCreateDialogProps) {
  return (
    <NotebookDialogShell
      icon={<FileText className="size-5" />}
      open={open}
      onOpenChange={onOpenChange}
      title={copy.createDialogTitle}
    >
        <div className="space-y-4 p-6">
          <p className="text-sm leading-relaxed text-[var(--notebook-soft-text)]">
            {copy.createDialogDescription}
          </p>
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
              {pending ? copy.saving : copy.confirmSaveDraft}
            </Button>
          </DialogFooter>
        </div>
    </NotebookDialogShell>
  );
}
