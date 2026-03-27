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
import { NotebookFolderPicker } from "./notebook-folder-picker";
import { notebookThemeStyle } from "./notebook-theme";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-0 text-[var(--notebook-ink)] shadow-xl"
        style={notebookThemeStyle}
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
      </DialogContent>
    </Dialog>
  );
}
