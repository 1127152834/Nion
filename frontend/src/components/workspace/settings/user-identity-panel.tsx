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
import type { UserIdentityField } from "@/core/user-identity/types";

type IdentityDraftKey =
  | "user_name"
  | "preferred_address_for_user"
  | "assistant_self_name"
  | "communication_style_preferences";

const IDENTITY_FIELDS: Array<{
  key: IdentityDraftKey;
  title: string;
  placeholder: string;
  textarea?: boolean;
}> = [
  {
    key: "user_name",
    title: "用户姓名",
    placeholder: "例如：张天成",
  },
  {
    key: "preferred_address_for_user",
    title: "称呼你",
    placeholder: "例如：大哥",
  },
  {
    key: "assistant_self_name",
    title: "我的自称",
    placeholder: "例如：小老弟",
  },
  {
    key: "communication_style_preferences",
    title: "沟通偏好",
    placeholder: "每行一条，例如：\n先给结论\n直接一点",
    textarea: true,
  },
];

function joinPreferenceLines(values: string[]): string {
  return values.join("\n");
}

function splitPreferenceLines(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\n|,|，/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function UserIdentityPanel() {
  const { profile, isLoading, error } = useUserIdentity();
  const patchUserIdentity = usePatchUserIdentity();
  const [drafts, setDrafts] = useState(() => ({
    user_name: "",
    preferred_address_for_user: "",
    assistant_self_name: "",
    communication_style_preferences: "",
  }));

  useEffect(() => {
    setDrafts({
      user_name: profile.user_name,
      preferred_address_for_user: profile.preferred_address_for_user,
      assistant_self_name: profile.assistant_self_name,
      communication_style_preferences: joinPreferenceLines(
        profile.communication_style_preferences,
      ),
    });
  }, [
    profile.assistant_self_name,
    profile.communication_style_preferences,
    profile.preferred_address_for_user,
    profile.user_name,
  ]);

  const currentValues = {
    user_name: profile.user_name,
    preferred_address_for_user: profile.preferred_address_for_user,
    assistant_self_name: profile.assistant_self_name,
    communication_style_preferences: joinPreferenceLines(
      profile.communication_style_preferences,
    ),
  };

  async function saveField(field: IdentityDraftKey) {
    const value =
      field === "communication_style_preferences"
        ? splitPreferenceLines(drafts[field])
        : drafts[field].trim();
    const label = IDENTITY_FIELDS.find((item) => item.key === field)?.title ?? "设定";

    try {
      await patchUserIdentity.mutateAsync({
        field: field as UserIdentityField,
        value,
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">称呼与身份</h2>
          <p className="text-muted-foreground text-sm">
            改完就生效，新对话会直接沿用。
          </p>
        </div>
        <Badge variant="outline">
          {profile.updated_at ? "已建立" : "未设置"}
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

      <div className="grid gap-4 xl:grid-cols-2">
        {IDENTITY_FIELDS.map((field) => {
          const currentValue = currentValues[field.key];
          const draftValue = drafts[field.key];
          const isDirty = draftValue !== currentValue;
          const isPending =
            patchUserIdentity.isPending &&
            patchUserIdentity.variables?.field === field.key;

          return (
            <Card key={field.key}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{field.title}</CardTitle>
                  <Badge variant={isDirty ? "secondary" : "outline"}>
                    {isPending ? "保存中" : isDirty ? "待保存" : "已同步"}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {currentValue || "尚未设置"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {field.textarea ? (
                  <Textarea
                    value={draftValue}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="min-h-28"
                  />
                ) : (
                  <Input
                    value={draftValue}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                  />
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-muted-foreground text-xs">
                    {field.key === "communication_style_preferences"
                      ? "每行一条。"
                      : "支持随时改写。"}
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardHeader className="space-y-2">
          <CardTitle>互称规则</CardTitle>
          <p className="text-muted-foreground text-sm">
            {profile.mutual_addressing_rule || "当你同时设定双方称呼时，这里会自动更新。"}
          </p>
        </CardHeader>
      </Card>
    </section>
  );
}
