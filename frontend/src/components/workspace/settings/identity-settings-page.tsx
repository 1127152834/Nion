"use client";

import { useEffect, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border px-4 py-2 text-sm"
              onClick={() => setMode("preview")}
            >
              预览
            </button>
            <button
              type="button"
              className="rounded-full border px-4 py-2 text-sm"
              onClick={() => setMode("edit")}
            >
              编辑
            </button>
          </div>
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
          <div className="rounded-xl border bg-background p-5">
            <div className="mb-3 text-sm font-medium">文档预览</div>
            <pre className="text-sm leading-7 whitespace-pre-wrap">{document}</pre>
          </div>
        ) : (
          <div className="rounded-xl border bg-background p-5">
            <div className="mb-3 text-sm font-medium">编辑文档</div>
            <Textarea
              className="min-h-64"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="button"
              className="mt-3 rounded-full border px-4 py-2 text-sm"
              onClick={() => void saveIdentityDocument.mutateAsync({ document: draft })}
            >
              保存并生效
            </button>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
