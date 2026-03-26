"use client";

import { Clock3Icon, EyeIcon, PencilIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NotebookNote } from "@/core/notebook";

import { MarkdownContent } from "../messages/markdown-content";

type NotebookEditorPaneCopy = {
  delete: string;
  history: string;
  move: string;
  noSelectionDescription: string;
  noSelectionTitle: string;
  noteTitlePlaceholder: string;
  preview: string;
  rename: string;
  save: string;
  saved: string;
  saving: string;
  selectNote: string;
  unsaved: string;
  edit: string;
};

type NotebookEditorPaneProps = {
  copy: NotebookEditorPaneCopy;
  dirty: boolean;
  draftBody: string;
  draftTitle: string;
  isLoading: boolean;
  loadingLabel: string;
  note: NotebookNote | null;
  onDraftBodyChange: (value: string) => void;
  onDraftTitleChange: (value: string) => void;
  onOpenDelete: () => void;
  onOpenHistory: () => void;
  onOpenMove: () => void;
  onOpenRename: () => void;
  onSave: () => void;
  savePending: boolean;
};

export function NotebookEditorPane({
  copy,
  dirty,
  draftBody,
  draftTitle,
  isLoading,
  loadingLabel,
  note,
  onDraftBodyChange,
  onDraftTitleChange,
  onOpenDelete,
  onOpenHistory,
  onOpenMove,
  onOpenRename,
  onSave,
  savePending,
}: NotebookEditorPaneProps) {
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <Card className="h-full rounded-none border-0 shadow-none">
      <CardHeader className="border-b">
        {!note ? (
          <div className="space-y-1">
            <CardTitle>{copy.noSelectionTitle}</CardTitle>
            <CardDescription>{copy.noSelectionDescription}</CardDescription>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{draftTitle || copy.selectNote}</CardTitle>
                <CardDescription>{note.relative_path}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={dirty ? "outline" : "secondary"}>
                  {dirty ? copy.unsaved : copy.saved}
                </Badge>
                <Button variant="outline" size="sm" onClick={onOpenRename}>
                  {copy.rename}
                </Button>
                <Button variant="outline" size="sm" onClick={onOpenMove}>
                  {copy.move}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode((current) => !current)}
                >
                  {previewMode ? <PencilIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  {previewMode ? copy.edit : copy.preview}
                </Button>
                <Button variant="outline" size="sm" onClick={onOpenHistory}>
                  <Clock3Icon className="size-4" />
                  {copy.history}
                </Button>
                <Button size="sm" onClick={onSave} disabled={!dirty || savePending}>
                  <SaveIcon className="size-4" />
                  {savePending ? copy.saving : copy.save}
                </Button>
                <Button variant="destructive" size="sm" onClick={onOpenDelete}>
                  <Trash2Icon className="size-4" />
                  {copy.delete}
                </Button>
              </div>
            </div>
            <Input
              value={draftTitle}
              onChange={(event) => onDraftTitleChange(event.target.value)}
              placeholder={copy.noteTitlePlaceholder}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="h-[calc(70vh-120px)] p-0">
        {!note || isLoading ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {isLoading ? loadingLabel : copy.noSelectionDescription}
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-6 py-5">
            {previewMode ? (
              <MarkdownContent
                className="prose prose-neutral max-w-none"
                content={draftBody}
                isLoading={false}
                rehypePlugins={[]}
              />
            ) : (
              <Textarea
                value={draftBody}
                onChange={(event) => onDraftBodyChange(event.target.value)}
                className="h-full min-h-full rounded-none border-0 px-0 py-0 font-mono text-sm shadow-none focus-visible:ring-0"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
