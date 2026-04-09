"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useApplySoulSettings, useSoulSettings } from "@/core/soul-console/hooks";
import type { SoulSettingsDraft, SoulSettingsResponse } from "@/core/soul-console/types";
import { toast } from "sonner";

const SOUL_SETTINGS_FIELDS: Array<{
  key: keyof SoulSettingsDraft;
  title: string;
  description: string;
  placeholder: string;
}> = [
  {
    key: "core_identity",
    title: "核心人格",
    description: "长期稳定的人格基底，决定助手在长期陪伴中的基本姿态。",
    placeholder: "例如：长期陪伴、克制稳定、结论先行、以用户长期价值为先。",
  },
  {
    key: "speech_style",
    title: "说话方式",
    description: "回答时的语气、节奏与表达习惯，只描述稳定偏好。",
    placeholder: "例如：先给结论，再补上下文；少口号，少过度鼓励。",
  },
  {
    key: "values_and_boundaries",
    title: "价值观 / 边界",
    description: "明确哪些原则必须长期坚持，哪些边界不能越过。",
    placeholder: "例如：不代替用户做最终判断，不用情绪裹挟结论。",
  },
  {
    key: "relationship_stance",
    title: "关系基调",
    description: "全局唯一的相处基调，用来约束长期陪伴关系。",
    placeholder: "例如：低刺激、少施压、结论先行、稳定陪伴。",
  },
];

function createDraft(settings: SoulSettingsResponse): SoulSettingsDraft {
  return {
    core_identity: settings.core_identity,
    speech_style: settings.speech_style,
    values_and_boundaries: settings.values_and_boundaries,
    relationship_stance: settings.relationship_stance,
  };
}

export function SoulConsolePage() {
  const { settings, isLoading, error } = useSoulSettings();
  const applySoulSettings = useApplySoulSettings();
  const [draft, setDraft] = useState<SoulSettingsDraft>(() => createDraft(settings));

  useEffect(() => {
    setDraft(createDraft(settings));
  }, [
    settings.core_identity,
    settings.speech_style,
    settings.values_and_boundaries,
    settings.relationship_stance,
  ]);

  const hasDraftChanges =
    draft.core_identity !== settings.core_identity ||
    draft.speech_style !== settings.speech_style ||
    draft.values_and_boundaries !== settings.values_and_boundaries ||
    draft.relationship_stance !== settings.relationship_stance;

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="border bg-background px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Settings
            </p>
            <h1 className="text-[1.85rem] font-semibold tracking-tight">
              Soul
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              这里只保留稳定层 Soul 设置：核心人格、说话方式、价值观 / 边界、关系基调，
              以及当前是否存在临时表达模式。产品主路径不再暴露治理元数据。
            </p>
          </div>
          <Badge variant="secondary">Stable Settings</Badge>
        </div>
      </header>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>当前状态</CardTitle>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                稳定层只响应用户明确设置或聊天中的明确确认；自动变化只允许出现在临时表达模式。
              </p>
            </div>
            <Badge variant={settings.has_active_overlay ? "secondary" : "outline"}>
              {settings.has_active_overlay ? "存在临时表达模式" : "无临时表达模式"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/10 p-4">
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
            当前切片先把 Soul 页面从治理控制台语义切到设置语义；正式写入链路会在后续设置任务中接入。
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <section className="rounded-lg border bg-background px-5 py-4 text-sm text-muted-foreground">
          正在加载 Soul 设置...
        </section>
      ) : null}

      {error ? (
        <section className="rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Soul 设置加载失败"}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {SOUL_SETTINGS_FIELDS.map((field) => (
          <Card key={field.key}>
            <CardHeader>
              <CardTitle>{field.title}</CardTitle>
              <p className="text-sm leading-7 text-muted-foreground">
                {field.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/10 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  当前设置
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {settings[field.key]}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {field.title}草稿
                </label>
                <Textarea
                  value={draft[field.key]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="min-h-32"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>草稿应用</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            这一页已经按设置语义收口：用户看到的是稳定层字段与临时表达模式提示，不再看到治理动作。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() =>
                void applySoulSettings
                  .mutateAsync({
                    core_identity: draft.core_identity.trim(),
                    speech_style: draft.speech_style.trim(),
                    values_and_boundaries: draft.values_and_boundaries.trim(),
                    relationship_stance: draft.relationship_stance.trim(),
                  })
                  .then(() => {
                    toast.success("已应用 Soul 设置");
                  })
                  .catch((mutationError) => {
                    toast.error(mutationError instanceof Error ? mutationError.message : "应用 Soul 设置失败");
                  })
              }
              disabled={!hasDraftChanges || applySoulSettings.isPending}
            >
              应用
            </Button>
            <span className="text-xs text-muted-foreground">
              {hasDraftChanges
                ? "草稿已经变化；点击应用后会写入稳定层设置。"
                : "当前草稿与已加载设置一致。"}
            </span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
