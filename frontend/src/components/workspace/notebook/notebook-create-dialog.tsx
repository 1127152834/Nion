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
        <DialogHeader>
          <DialogTitle>{copy.createDialogTitle}</DialogTitle>
          <DialogDescription>{copy.createDialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={copy.noteTitlePlaceholder}
          />
          <Input
            value={directory}
            onChange={(event) => onDirectoryChange(event.target.value)}
            placeholder={copy.noteDirectoryPlaceholder}
          />
          <Textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={copy.emptyDescription}
            className="min-h-40"
          />
        </div>
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
      </DialogContent>
    </Dialog>
  );
}
