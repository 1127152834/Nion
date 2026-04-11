"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";

import { useSettingsDialog } from "./settings-dialog-context";
import { SettingsSection } from "./settings-section";

export function MemorySettingsPage() {
  const { t } = useI18n();
  const { goToSection } = useSettingsDialog();

  return (
    <SettingsSection
      title={t.settings.memory.title}
      description="记忆页只保留用户真正需要的入口：去哪里看、去哪里改，以及什么时候直接在对话里说。"
    >
      <div className="space-y-4">
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

        <section className="rounded-xl border bg-background/80 p-5 shadow-sm">
          <div className="space-y-2">
            <div className="text-sm font-medium">改你的长期信息</div>
            <div className="text-muted-foreground text-sm">
              像称呼、角色、时区、长期背景这类稳定信息，放在身份设置里更清楚。
            </div>
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => goToSection("identity")}
              >
                打开身份
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-background/80 p-5 shadow-sm">
          <div className="space-y-2">
            <div className="text-sm font-medium">改助手的长期风格</div>
            <div className="text-muted-foreground text-sm">
              像说话方式、价值边界、关系基调这类长期风格，统一放在 Soul 设置里。
            </div>
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => goToSection("soul")}
              >
                打开 Soul
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-muted/20 p-5">
          <div className="space-y-2">
            <div className="text-sm font-medium">临时纠正怎么做</div>
            <div className="text-muted-foreground text-sm">
              如果只是这次记错了，或者不想继续沿用某个说法，直接在对话里告诉助手就可以，不需要来设置页翻找开关。
            </div>
          </div>
        </section>
      </div>
    </SettingsSection>
  );
}
