"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSoulSettings } from "@/core/soul-settings/hooks";

const SUMMARY_FIELDS: Array<{
  key:
    | "core_identity"
    | "speech_style"
    | "values_and_boundaries"
    | "relationship_stance";
  label: string;
}> = [
  { key: "core_identity", label: "核心人格" },
  { key: "speech_style", label: "说话方式" },
  { key: "values_and_boundaries", label: "价值观 / 边界" },
  { key: "relationship_stance", label: "关系基调" },
];

export function SoulSummaryCard() {
  const { settings, isLoading } = useSoulSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Soul 设置摘要</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground leading-7">
          这里先展示稳定层 Soul 设置摘要，避免继续把 Soul
          当成记忆工作台的一部分。
        </p>

        {isLoading ? (
          <p className="text-muted-foreground text-xs">
            正在加载 Soul 设置摘要。
          </p>
        ) : null}

        <div className="grid gap-3">
          {SUMMARY_FIELDS.map((field) => (
            <div key={field.key} className="bg-muted/10 rounded-lg border p-3">
              <div className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
                {field.label}
              </div>
              <p className="text-muted-foreground mt-2 text-sm leading-7 whitespace-pre-wrap">
                {settings[field.key]}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-muted/10 rounded-lg border p-3">
          <div className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
            临时表达模式
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-7 whitespace-pre-wrap">
            {settings.has_active_overlay
              ? (settings.adaptive_overlay_summary ?? "当前存在临时表达模式。")
              : "当前没有临时表达模式。"}
          </p>
        </div>

        <p className="text-muted-foreground text-xs">
          正式入口位于 Settings &gt; Soul；当前卡片只负责展示稳定层摘要。
        </p>
      </CardContent>
    </Card>
  );
}
