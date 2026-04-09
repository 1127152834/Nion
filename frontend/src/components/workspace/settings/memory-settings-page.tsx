"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";
import { useSettingsDialog } from "./settings-dialog-context";

import { MemoryEmbeddingPanel } from "./memory-embedding-panel";
import { SettingsSection } from "./settings-section";

export function MemorySettingsPage() {
  const { t } = useI18n();
  const { goToSection } = useSettingsDialog();

  return (
    <SettingsSection
      title={t.settings.memory.title}
      description="这里只放记忆系统的运行规则与边界，不展示记忆工作台本身。"
    >
      <div className="space-y-4">
        <section className="rounded-xl border bg-background/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">运行时后端</div>
              <div className="text-muted-foreground text-sm">
                当前长期记忆由 Memory OS 驱动，运行时不再依赖 legacy `memory.json`。
              </div>
            </div>
            <Badge variant="secondary">Memory OS</Badge>
          </div>
        </section>

        <section className="rounded-xl border bg-background/80 p-4 shadow-sm">
          <div className="space-y-1">
            <div className="text-sm font-medium">Soul 初始化</div>
            <div className="text-muted-foreground text-sm">
              主智能体会保留一个最小核心人格基底；当用户明确表达希望助手具备怎样的人格、价值观或回答风格时，系统应进入 soul 设置引导流程，而不是继续使用默认基底。
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-background/80 p-4 shadow-sm">
          <div className="space-y-1">
            <div className="text-sm font-medium">自动成长边界</div>
            <div className="text-muted-foreground text-sm">
              记忆、灵魂和自动化成长都走治理链路。系统允许反思与成长，但不会把一次聊天直接升级成长期人格或长期自动化。
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-background/80 p-4 shadow-sm">
          <div className="space-y-1">
            <div className="text-sm font-medium">数据生命周期</div>
            <div className="text-muted-foreground text-sm">
              长期不用的内容会进入归档与清理周期。工作台里的记忆内容是当前真相层的产品面，不属于设置页。
            </div>
          </div>
        </section>

        <MemoryEmbeddingPanel />

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={pathOfMemory()}>打开记忆工作台</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => goToSection("soul")}>
            打开 Soul 设置
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}
