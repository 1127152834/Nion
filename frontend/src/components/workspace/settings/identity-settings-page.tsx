"use client";

import { useEffect, useState } from "react";

import {
  DocumentModeToggle,
  MarkdownDocumentEditor,
  MarkdownDocumentView,
} from "@/components/workspace/documents";
import { SettingsSection } from "@/components/workspace/settings/settings-section";
import {
  useIdentityDocument,
  useSaveIdentityDocument,
} from "@/core/user-identity/hooks";

export function IdentitySettingsPage() {
  const { document, isLoading, error } = useIdentityDocument();
  const saveIdentityDocument = useSaveIdentityDocument();
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [draft, setDraft] = useState(document);

  useEffect(() => {
    if (mode === "preview") {
      setDraft(document);
    }
  }, [document, mode]);

  return (
    <SettingsSection
      title="身份"
      description="IDENTITY.md 默认以预览模式展示，进入编辑模式后可直接修改整篇文档。"
    >
      <div className="space-y-4">
        <div className="rounded-xl border bg-background p-5">
          <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-[0.16em]">
            IDENTITY.md
          </div>
          <DocumentModeToggle mode={mode} onModeChange={setMode} />
        </div>
        {isLoading ? (
          <div className="rounded-xl border bg-background p-5 text-sm text-muted-foreground">
            正在加载 IDENTITY.md...
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border bg-background p-5 text-sm text-destructive">
            {error instanceof Error ? error.message : "IDENTITY.md 加载失败"}
          </div>
        ) : null}
        {mode === "preview" ? (
          <MarkdownDocumentView
            title="身份主档"
            documentName="IDENTITY.md"
            document={document}
          />
        ) : (
          <MarkdownDocumentEditor
            title="编辑身份主档"
            documentName="IDENTITY.md"
            draft={draft}
            onChange={setDraft}
            onSave={() => void saveIdentityDocument.mutateAsync({ document: draft })}
            isSaving={saveIdentityDocument.isPending}
          />
        )}
      </div>
    </SettingsSection>
  );
}
