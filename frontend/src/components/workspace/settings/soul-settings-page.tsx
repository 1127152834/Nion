"use client";

import { Textarea } from "@/components/ui/textarea";

import { SettingsSection } from "@/components/workspace/settings/settings-section";

export function SoulSettingsPage() {
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
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-full border px-4 py-2 text-sm">
              预览
            </button>
            <button type="button" className="rounded-full border px-4 py-2 text-sm">
              编辑
            </button>
          </div>
        </div>
        <div className="rounded-xl border bg-background p-5">
          <div className="mb-3 text-sm font-medium">文档预览</div>
          <pre className="text-sm leading-7 whitespace-pre-wrap">{`# Soul

## Core Identity
长期陪伴、克制稳定、结论先行。

## Speech Style
先给结论，再补上下文。`}</pre>
        </div>
        <div className="rounded-xl border bg-background p-5">
          <div className="mb-3 text-sm font-medium">编辑文档</div>
          <Textarea className="min-h-64" />
          <div className="text-muted-foreground mt-3 text-xs">保存并生效</div>
        </div>
      </div>
    </SettingsSection>
  );
}
