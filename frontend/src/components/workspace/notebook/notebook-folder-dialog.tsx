"use client";

import { FolderPenIcon, FolderPlusIcon, FolderXIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type NotebookFolderDialogMode = "create" | "rename" | "delete";

type NotebookFolderDialogCopy = {
  cancel: string;
  confirmCreate: string;
  confirmDelete: string;
  confirmRename: string;
  createFolder: string;
  deleteFolder: string;
  deleteFolderDescription: string;
  folderNameLabel: string;
  folderNamePlaceholder: string;
  renameFolder: string;
  rootFolderLabel: string;
  saveToPrefix: string;
  saving: string;
};

type NotebookFolderDialogProps = {
  copy: NotebookFolderDialogCopy;
  mode: NotebookFolderDialogMode;
  name: string;
  open: boolean;
  parentLabel?: string | null;
  pending: boolean;
  targetLabel?: string | null;
  onNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
};

const dialogMeta: Record<
  NotebookFolderDialogMode,
  {
    actionKey: keyof NotebookFolderDialogCopy;
    icon: ReactNode;
    titleKey: keyof NotebookFolderDialogCopy;
  }
> = {
  create: {
    actionKey: "confirmCreate",
    icon: <FolderPlusIcon className="size-5" />,
    titleKey: "createFolder",
  },
  rename: {
    actionKey: "confirmRename",
    icon: <FolderPenIcon className="size-5" />,
    titleKey: "renameFolder",
  },
  delete: {
    actionKey: "confirmDelete",
    icon: <FolderXIcon className="size-5" />,
    titleKey: "deleteFolder",
  },
};

export function NotebookFolderDialog({
  copy,
  mode,
  name,
  open,
  parentLabel,
  pending,
  targetLabel,
  onNameChange,
  onOpenChange,
  onSubmit,
}: NotebookFolderDialogProps) {
  const meta = dialogMeta[mode];
  const resolvedTargetLabel = targetLabel || copy.rootFolderLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-0 text-[var(--notebook-ink)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--notebook-border)] px-6 py-4">
          <div className="flex items-center text-lg font-semibold text-[var(--notebook-ink)]">
            <span className="mr-2 text-[var(--notebook-soft-text)]">{meta.icon}</span>
            {copy[meta.titleKey]}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          {mode === "delete" ? (
            <p className="text-sm text-[var(--notebook-soft-text)]">
              {copy.deleteFolderDescription.replace("{folder}", resolvedTargetLabel)}
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--notebook-soft-text)]">
                  {copy.folderNameLabel}
                </label>
                <Input
                  autoFocus
                  value={name}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder={copy.folderNamePlaceholder}
                  className="border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] placeholder:text-[var(--notebook-soft-text)]"
                />
              </div>
              {mode === "create" && parentLabel ? (
                <p className="text-xs text-[var(--notebook-soft-text)]">
                  {copy.saveToPrefix}
                  {parentLabel}
                </p>
              ) : null}
            </>
          )}
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
              disabled={(mode !== "delete" && !name.trim()) || pending}
            >
              {pending ? copy.saving : copy[meta.actionKey]}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
