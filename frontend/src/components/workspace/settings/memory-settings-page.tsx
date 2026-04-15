"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";

import { MemoryEmbeddingPanel } from "./memory-embedding-panel";
import { useSettingsDialog } from "./settings-dialog-context";
import { SettingsSection } from "./settings-section";

export function MemorySettingsPage() {
  const { t } = useI18n();
  const { goToSection } = useSettingsDialog();

  return (
    <SettingsSection
      title={t.settings.memory.title}
      description="这里只看检索增强状态。检索模型的配置入口已经迁到独立的检索模型页面。"
    >
      <div className="space-y-4">
        <MemoryEmbeddingPanel />

        <section className="rounded-xl border bg-background/80 p-5 shadow-sm">
          <div className="space-y-2">
            <div className="text-sm font-medium">前往检索模型</div>
            <div className="text-muted-foreground text-sm">
              如果你要修改检索增强使用的 embedding 或 reranker，请直接去检索模型页面。
            </div>
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => goToSection("retrievalModels")}
              >
                前往检索模型
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-background/80 p-5 shadow-sm">
          <div className="space-y-2">
            <div className="text-sm font-medium">查看已经记住的内容</div>
            <div className="text-muted-foreground text-sm">
              打开记忆页，直接看当前已经留下来的稳定信息、长期背景和事实记忆。
            </div>
            <div className="pt-1">
              <Button asChild variant="outline">
                <Link href={pathOfMemory()}>打开记忆</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </SettingsSection>
  );
}
