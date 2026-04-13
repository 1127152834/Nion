"use client";

import { useEffect, useState } from "react";

import {
  DocumentModeToggle,
  MarkdownDocumentEditor,
  MarkdownDocumentView,
} from "@/components/workspace/documents";
import { SettingsSection } from "@/components/workspace/settings/settings-section";
import { useSaveSoulDocument, useSoulDocument } from "@/core/soul-settings/hooks";

export function SoulSettingsPage() {
  const { document, isLoading, error } = useSoulDocument();
  const saveSoulDocument = useSaveSoulDocument();
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [draft, setDraft] = useState(document);

  useEffect(() => {
    if (mode === "preview") {
      setDraft(document);
    }
  }, [document, mode]);

  return (
    <SettingsSection
      title="Soul"
      description="SOUL.md 默认以预览模式展示，进入编辑模式后可直接修改整篇文档。"
    >
      <div className="space-y-4">
        <div className="rounded-xl border bg-background p-5">
          <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-[0.16em]">
            SOUL.md
          </div>
          <DocumentModeToggle mode={mode} onModeChange={setMode} />
        </div>
        {isLoading ? (
          <div className="rounded-xl border bg-background p-5 text-sm text-muted-foreground">
            正在加载 SOUL.md...
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border bg-background p-5 text-sm text-destructive">
            {error instanceof Error ? error.message : "SOUL.md 加载失败"}
          </div>
        ) : null}
        {mode === "preview" ? (
          <MarkdownDocumentView
            title="灵魂主档"
            documentName="SOUL.md"
            document={document}
          />
        ) : (
          <MarkdownDocumentEditor
            title="编辑灵魂主档"
            documentName="SOUL.md"
            draft={draft}
            onChange={setDraft}
            onSave={() => void saveSoulDocument.mutateAsync({ document: draft })}
            isSaving={saveSoulDocument.isPending}
          />
        )}
      </div>
    </SettingsSection>
  );
}
