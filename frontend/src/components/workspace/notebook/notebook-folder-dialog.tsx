"use client";

import { FolderPenIcon, FolderPlusIcon, FolderXIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NotebookDialogShell } from "./notebook-dialog-shell";

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
    <NotebookDialogShell
      icon={meta.icon}
      open={open}
      onOpenChange={onOpenChange}
      title={copy[meta.titleKey]}
    >
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
    </NotebookDialogShell>
  );
}
