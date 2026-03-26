"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  NotebookAssistAction,
  NotebookHistoryEntry,
  NotebookNote,
} from "@/core/notebook";
import { formatTimeAgo } from "@/core/utils/datetime";

type NotebookContextTab = "ask" | "history" | "info";

type NotebookContextPanelCopy = {
  assistActionItems: string;
  assistChecklist: string;
  assistDescription: string;
  assistExpand: string;
  assistRewrite: string;
  assistSummarize: string;
  assistTitle: string;
  askTab: string;
  historyTab: string;
  infoContentHash: string;
  infoCreatedAt: string;
  infoNoteId: string;
  infoPath: string;
  infoTab: string;
  infoUpdatedAt: string;
  historyTitle: string;
  noSelectionDescription: string;
  restore: string;
  selectNote: string;
};

type NotebookContextPanelProps = {
  activeTab: NotebookContextTab;
  copy: NotebookContextPanelCopy;
  entries: NotebookHistoryEntry[];
  note: NotebookNote | null;
  notePath: string | null;
  noteTitle: string;
  onActiveTabChange: (tab: NotebookContextTab) => void;
  onAssist: (action: NotebookAssistAction) => void;
  onRestoreVersion: (versionId: string) => void;
};

export function NotebookContextPanel({
  activeTab,
  copy,
  entries,
  note,
  notePath,
  noteTitle,
  onActiveTabChange,
  onAssist,
  onRestoreVersion,
}: NotebookContextPanelProps) {
  const infoRows = useMemo(() => {
    if (!note) {
      return [];
    }

    return [
      { label: copy.infoNoteId, value: note.note_id },
      { label: copy.infoPath, value: notePath ?? note.relative_path },
      { label: copy.infoCreatedAt, value: note.created_at },
      { label: copy.infoUpdatedAt, value: note.updated_at },
      { label: copy.infoContentHash, value: note.content_hash },
    ];
  }, [copy, note, notePath]);

  return (
    <Card className="h-full rounded-none border-0 shadow-none">
      <CardHeader className="gap-3 border-b">
        <div className="space-y-1">
          <CardTitle>{copy.assistTitle}</CardTitle>
          <CardDescription>
            {note ? note.relative_path : copy.noSelectionDescription}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeTab === "ask" ? "default" : "outline"}
            onClick={() => onActiveTabChange("ask")}
          >
            {copy.askTab}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => onActiveTabChange("history")}
          >
            {copy.historyTab}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "info" ? "default" : "outline"}
            onClick={() => onActiveTabChange("info")}
          >
            {copy.infoTab}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {!note ? (
          <div className="text-muted-foreground text-sm">
            {copy.noSelectionDescription}
          </div>
        ) : activeTab === "history" ? (
          <div className="space-y-3">
            <div className="text-sm font-medium">{copy.historyTitle}</div>
            {entries.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                {copy.noSelectionDescription}
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.version_id}
                  className="space-y-2 rounded-xl border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{entry.operation}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatTimeAgo(entry.timestamp)}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {entry.actor_type} · {entry.path_at_time}
                  </div>
                  {entry.diff_text ? (
                    <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs leading-5 whitespace-pre-wrap">
                      {entry.diff_text}
                    </pre>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRestoreVersion(entry.version_id)}
                  >
                    {copy.restore}
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : activeTab === "info" ? (
          <div className="space-y-3">
            {infoRows.map((row) => (
              <div key={row.label} className="space-y-1 rounded-xl border p-3">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">
                  {row.label}
                </div>
                <div className="break-all text-sm font-medium">{row.value}</div>
              </div>
            ))}
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
