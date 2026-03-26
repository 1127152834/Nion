"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { NotebookAssistAction, NotebookNote } from "@/core/notebook";

type NotebookContextPanelCopy = {
  assistActionItems: string;
  assistChecklist: string;
  assistDescription: string;
  assistExpand: string;
  assistRewrite: string;
  assistSummarize: string;
  assistTitle: string;
  noSelectionDescription: string;
  selectNote: string;
};

type NotebookContextPanelProps = {
  copy: NotebookContextPanelCopy;
  note: NotebookNote | null;
  notePath: string | null;
  noteTitle: string;
  onAssist: (action: NotebookAssistAction) => void;
};

export function NotebookContextPanel({
  copy,
  note,
  notePath,
  noteTitle,
  onAssist,
}: NotebookContextPanelProps) {
  return (
    <Card className="h-full rounded-none border-0 shadow-none">
      <CardHeader className="gap-3 border-b">
        <div className="space-y-1">
          <CardTitle>{copy.assistTitle}</CardTitle>
          <CardDescription>
            {note ? note.relative_path : copy.noSelectionDescription}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {!note ? (
          <div className="text-muted-foreground text-sm">
            {copy.noSelectionDescription}
          </div>
        ) : (
          <>
            <div className="space-y-2 rounded-xl border border-dashed bg-muted/20 p-3">
              <div className="font-medium">{noteTitle || copy.selectNote}</div>
              <p className="text-muted-foreground break-all text-sm">
                {notePath ?? note.relative_path}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              {copy.assistDescription}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onAssist("summarize")}>
                {copy.assistSummarize}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAssist("rewrite")}>
                {copy.assistRewrite}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAssist("expand")}>
                {copy.assistExpand}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAssist("checklist")}>
                {copy.assistChecklist}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAssist("action_items")}>
                {copy.assistActionItems}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
