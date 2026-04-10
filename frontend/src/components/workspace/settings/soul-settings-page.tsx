"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { UserIdentityPanel } from "@/components/workspace/settings/user-identity-panel";
import {
  usePatchSoulSetting,
  useSoulSettings,
} from "@/core/soul-settings/hooks";
import type { SoulSettingsField } from "@/core/soul-settings/types";

const SOUL_FIELDS: Array<{
  key: SoulSettingsField;
  title: string;
  placeholder: string;
}> = [
  {
    key: "core_identity",
    title: "核心人格",
    placeholder: "例如：长期陪伴、克制稳定、结论先行。",
  },
  {
    key: "speech_style",
    title: "说话方式",
    placeholder: "例如：先给结论，再补上下文。",
  },
  {
    key: "values_and_boundaries",
    title: "价值观 / 边界",
    placeholder: "例如：不代替用户做最终判断。",
  },
  {
    key: "relationship_stance",
    title: "关系基调",
    placeholder: "例如：低刺激、少施压、稳定陪伴。",
  },
];

const EMPTY_SOUL_VALUES: Record<SoulSettingsField, string> = {
  core_identity: "目前还没有稳定的核心人格设置。",
  speech_style: "目前还没有稳定的说话方式设置。",
  values_and_boundaries: "目前还没有稳定的价值观与边界设置。",
  relationship_stance: "目前还没有稳定的关系基调设置。",
};

function normalizeSoulValue(field: SoulSettingsField, value: string): string {
  return value === EMPTY_SOUL_VALUES[field] ? "" : value;
}

function SoulFieldCard(props: {
  field: SoulSettingsField;
  title: string;
  currentValue: string;
  placeholder: string;
  isPending: boolean;
  onSave: (field: SoulSettingsField, value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(props.currentValue);

  useEffect(() => {
    setDraft(props.currentValue);
  }, [props.currentValue]);

  const isDirty = draft !== props.currentValue;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{props.title}</CardTitle>
          <Badge variant={isDirty ? "secondary" : "outline"}>
            {props.isPending ? "保存中" : isDirty ? "待保存" : "已同步"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">
          {props.currentValue || "尚未设置"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={props.placeholder}
          className="min-h-32"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">保存后立即生效。</p>
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || props.isPending}
            onClick={() => void props.onSave(props.field, draft)}
          >
            {props.isPending ? "保存中" : "保存"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SoulSettingsPage() {
  const { settings, isLoading, error } = useSoulSettings();
  const patchSoulSetting = usePatchSoulSetting();

  async function saveSoulField(field: SoulSettingsField, value: string) {
    const label = SOUL_FIELDS.find((item) => item.key === field)?.title ?? "设定";

    try {
      await patchSoulSetting.mutateAsync({
        field,
        value: value.trim(),
      });
      toast.success(`${label}已更新`);
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : `${label}更新失败`,
      );
    }
  }

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="bg-background border px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
              Settings &gt; Soul
            </p>
            <h1 className="text-[1.85rem] font-semibold tracking-tight">
              Soul
            </h1>
            <p className="text-muted-foreground text-sm">
              长期设定会直接影响后续对话。
            </p>
          </div>
          <Badge variant={settings.has_active_overlay ? "secondary" : "outline"}>
            {settings.has_active_overlay ? "当前有临时微调" : "当前是稳定模式"}
          </Badge>
        </div>
      </header>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>当前表达</CardTitle>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">
            {settings.has_active_overlay
              ? settings.adaptive_overlay_summary ?? "临时微调已生效。"
              : "没有额外临时微调。"}
          </p>
        </CardHeader>
      </Card>

      {isLoading ? (
        <section className="bg-background text-muted-foreground rounded-lg border px-5 py-4 text-sm">
          正在加载 Soul 设置...
        </section>
      ) : null}

      {error ? (
        <section className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-5 py-4 text-sm">
          {error instanceof Error ? error.message : "Soul 设置加载失败"}
        </section>
      ) : null}

      <UserIdentityPanel />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">长期风格</h2>
          <p className="text-muted-foreground text-sm">
            逐项调整即可。
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {SOUL_FIELDS.map((field) => (
            <SoulFieldCard
              key={field.key}
              field={field.key}
              title={field.title}
              currentValue={normalizeSoulValue(field.key, settings[field.key])}
              placeholder={field.placeholder}
              isPending={
                patchSoulSetting.isPending &&
                patchSoulSetting.variables?.field === field.key
              }
              onSave={saveSoulField}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
