"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSoulSummary } from "@/core/soul/hooks";

const SUMMARY_FIELDS: Array<{
  key: "core_identity" | "speech_style" | "values_and_boundaries" | "relationship_stance";
  label: string;
}> = [
  { key: "core_identity", label: "核心人格" },
  { key: "speech_style", label: "说话方式" },
  { key: "values_and_boundaries", label: "价值观 / 边界" },
  { key: "relationship_stance", label: "关系基调" },
];

export function SoulSummaryCard() {
  const { soulSummary, isLoading } = useSoulSummary();

  const settings = {
    core_identity: soulSummary?.core_soul?.summary ?? "目前还没有稳定的核心人格设置。",
    speech_style:
      soulSummary?.staged_identity_narrative?.summary ?? "目前还没有稳定的说话方式设置。",
    values_and_boundaries: soulSummary?.summary?.baseline ?? "目前还没有稳定的价值观与边界设置。",
    relationship_stance: soulSummary?.summary?.relationship ?? "目前还没有稳定的关系基调设置。",
    has_active_overlay: Boolean(soulSummary?.current_soul?.summary),
    adaptive_overlay_summary: soulSummary?.current_soul?.summary ?? null,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Soul 设置摘要</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="leading-7 text-muted-foreground">
          这里先展示稳定层 Soul 设置摘要，避免继续把 Soul 当成记忆工作台的一部分。
        </p>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">正在加载 Soul 设置摘要。</p>
        ) : null}

        <div className="grid gap-3">
          {SUMMARY_FIELDS.map((field) => (
            <div key={field.key} className="rounded-lg border bg-muted/10 p-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {field.label}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {settings[field.key]}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-muted/10 p-3">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            临时表达模式
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {settings.has_active_overlay
              ? settings.adaptive_overlay_summary ?? "当前存在临时表达模式。"
              : "当前没有临时表达模式。"}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          正式入口会在后续信息架构任务里归到 Settings；当前卡片只负责展示稳定层摘要。
        </p>
      </CardContent>
    </Card>
  );
}
