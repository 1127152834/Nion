"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  usePatchUserIdentity,
  useUserIdentity,
} from "@/core/user-identity/hooks";
import type {
  UserIdentityField,
  UserIdentityProfile,
} from "@/core/user-identity/types";

type IdentityDraftKey = Exclude<UserIdentityField, "mutual_addressing_rule">;

type IdentityFieldConfig = {
  key: IdentityDraftKey;
  title: string;
  placeholder: string;
  helpText: string;
  textarea?: boolean;
};

type FieldState = {
  draft: string;
  baseline: string;
};

type IdentitySectionConfig = {
  title: string;
  description: string;
  fields: IdentityFieldConfig[];
};

const IDENTITY_SECTIONS: IdentitySectionConfig[] = [
  {
    title: "称呼方式",
    description: "先把彼此怎么称呼说清楚，后面每次开聊都会更顺手。",
    fields: [
      {
        key: "user_name",
        title: "用户姓名",
        placeholder: "例如：张天成",
        helpText: "正式名字，适合需要准确称呼的时候。",
      },
      {
        key: "user_aliases",
        title: "常用别名",
        placeholder: "每行一条，例如：\n老张\n张总",
        helpText: "系统会把这些也当成你的稳定称呼线索。",
        textarea: true,
      },
      {
        key: "preferred_address_for_user",
        title: "称呼你",
        placeholder: "例如：大哥",
        helpText: "助手平时最常用的称呼。",
      },
      {
        key: "assistant_self_name",
        title: "我的自称",
        placeholder: "例如：小老弟",
        helpText: "需要时，助手怎么称呼自己。",
      },
    ],
  },
  {
    title: "协作方式",
    description: "把长期不变的沟通习惯和边界留在这里，避免每次重讲。",
    fields: [
      {
        key: "communication_style_preferences",
        title: "沟通偏好",
        placeholder: "每行一条，例如：\n先给结论\n直接一点",
        helpText: "每行一条，写你希望一直保持的表达方式。",
        textarea: true,
      },
      {
        key: "interaction_boundaries",
        title: "互动边界",
        placeholder: "每行一条，例如：\n不要替我拍板\n少施压",
        helpText: "每行一条，系统会把它们当作长期协作边界。",
        textarea: true,
      },
    ],
  },
  {
    title: "背景信息",
    description: "只保留长期有效的背景，方便助手快速进入正确语境。",
    fields: [
      {
        key: "user_role",
        title: "用户角色",
        placeholder: "例如：财务 BP",
        helpText: "你的稳定职责或身份标签。",
      },
      {
        key: "timezone",
        title: "时区",
        placeholder: "例如：Asia/Shanghai",
        helpText: "用来判断时间表达和提醒节奏。",
      },
      {
        key: "long_term_background_summary",
        title: "长期背景",
        placeholder: "例如：长期负责经营分析与月度复盘。",
        helpText: "一句到几句就够，写那些长期不会很快变化的背景。",
        textarea: true,
      },
    ],
  },
];

const ALL_FIELDS = IDENTITY_SECTIONS.flatMap((section) => section.fields);

function joinLines(values: string[]): string {
  return values.join("\n");
}

function splitLines(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\n|,|，/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function serializeProfileField(
  profile: UserIdentityProfile,
  field: IdentityDraftKey,
): string {
  if (field === "communication_style_preferences") {
    return joinLines(profile.communication_style_preferences);
  }
  if (field === "interaction_boundaries") {
    return joinLines(profile.interaction_boundaries);
  }
  if (field === "user_aliases") {
    return joinLines(profile.user_aliases);
  }
  return String(profile[field] ?? "");
}

function buildFieldState(profile: UserIdentityProfile): Record<IdentityDraftKey, FieldState> {
  return Object.fromEntries(
    ALL_FIELDS.map((field) => {
      const baseline = serializeProfileField(profile, field.key);
      return [field.key, { draft: baseline, baseline }];
    }),
  ) as Record<IdentityDraftKey, FieldState>;
}

function normalizePatchValue(
  field: IdentityDraftKey,
  draft: string,
): string | string[] {
  if (
    field === "communication_style_preferences" ||
    field === "interaction_boundaries" ||
    field === "user_aliases"
  ) {
    return splitLines(draft);
  }
  return draft.trim();
}

export function UserIdentityPanel() {
  const { profile, isLoading, error } = useUserIdentity();
  const patchUserIdentity = usePatchUserIdentity();
  const [fieldState, setFieldState] = useState<Record<IdentityDraftKey, FieldState>>(
    () => buildFieldState(profile),
  );

  useEffect(() => {
    setFieldState((current) => {
      const next = { ...current };
      for (const field of ALL_FIELDS) {
        const baseline = serializeProfileField(profile, field.key);
        const previous = current[field.key];
        if (!previous || previous.draft === previous.baseline) {
          next[field.key] = { draft: baseline, baseline };
          continue;
        }
        next[field.key] = { draft: previous.draft, baseline };
      }
      return next;
    });
  }, [profile]);

  function updateField(field: IdentityDraftKey, nextDraft: string) {
    setFieldState((current) => ({
      ...current,
      [field]: {
        ...current[field],
        draft: nextDraft,
      },
    }));
  }

  async function saveField(field: IdentityDraftKey) {
    const value = normalizePatchValue(field, fieldState[field].draft);
    const label = ALL_FIELDS.find((item) => item.key === field)?.title ?? "设定";

    try {
      const updatedProfile = await patchUserIdentity.mutateAsync({
        field: field as UserIdentityField,
        value,
      });
      const savedValue = serializeProfileField(updatedProfile, field);
      setFieldState((current) => ({
        ...current,
        [field]: {
          draft: savedValue,
          baseline: savedValue,
        },
      }));
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">你的信息</h2>
          <p className="text-muted-foreground text-sm">
            这里保存的是长期有效的信息，方便助手在新对话里更快进入正确语境。
          </p>
        </div>
        <Badge variant="outline">
          {profile.updated_at ? "已记录" : "待补充"}
        </Badge>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="text-muted-foreground px-5 py-4 text-sm">
            正在读取身份设置...
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="text-destructive px-5 py-4 text-sm">
            {error instanceof Error ? error.message : "身份设置加载失败"}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {IDENTITY_SECTIONS.map((section) => (
          <Card key={section.title} className="h-full">
            <CardHeader className="space-y-2">
              <CardTitle>{section.title}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {section.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {section.fields.map((field) => {
                const state = fieldState[field.key];
                const isDirty = state.draft !== state.baseline;
                const isPending =
                  patchUserIdentity.isPending &&
                  patchUserIdentity.variables?.field === field.key;

                return (
                  <div key={field.key} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{field.title}</div>
                        <p className="text-muted-foreground text-xs leading-5">
                          {field.helpText}
                        </p>
                      </div>
                      <Badge variant={isDirty ? "secondary" : "outline"}>
                        {isPending ? "保存中" : isDirty ? "待保存" : "已同步"}
                      </Badge>
                    </div>
                    {field.textarea ? (
                      <Textarea
                        value={state.draft}
                        onChange={(event) =>
                          updateField(field.key, event.target.value)
                        }
                        placeholder={field.placeholder}
                        className="min-h-28"
                      />
                    ) : (
                      <Input
                        value={state.draft}
                        onChange={(event) =>
                          updateField(field.key, event.target.value)
                        }
                        placeholder={field.placeholder}
                      />
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-muted-foreground text-xs">
                        {state.baseline || "尚未设置"}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!isDirty || isPending}
                        onClick={() => void saveField(field.key)}
                      >
                        {isPending ? "保存中" : "保存"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardHeader className="space-y-2">
          <CardTitle>互称规则</CardTitle>
          <p className="text-muted-foreground text-sm">
            {profile.mutual_addressing_rule || "当双方称呼都设好后，这里会自动整理成一句清晰规则。"}
          </p>
        </CardHeader>
      </Card>
    </section>
  );
}
