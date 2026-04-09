"use client";

import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import { useMemoryUserSurface } from "@/core/memory-canonical/hooks";
import {
  useCorrectUserModelItem,
  useForgetUserModelItem,
  useFreezeUserModelItem,
  useRejectUserModelItem,
  useUserModelItems,
} from "@/core/memory-growth/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";

import { MemoryBackLink } from "./memory-back-link";

export function MemoryUserPage() {
  const { t } = useI18n();
  const { user } = useMemoryUserSurface();
  const { items } = useUserModelItems();
  const correctUserModel = useCorrectUserModelItem();
  const freezeUserModel = useFreezeUserModelItem();
  const forgetUserModel = useForgetUserModelItem();
  const rejectUserModel = useRejectUserModelItem();

  const workRecord = items.find((item) => item.subtype === "workContext");
  const personalRecord = items.find((item) => item.subtype === "personalContext");
  const topOfMindRecord = items.find((item) => item.subtype === "topOfMind");

  const cardInputs = [
    {
      record: workRecord,
      title: t.settings.memory.markdown.work,
      fallbackSummary: user?.workContext.summary ?? "",
    },
    {
      record: personalRecord,
      title: t.settings.memory.markdown.personal,
      fallbackSummary: user?.personalContext.summary ?? "",
    },
    {
      record: topOfMindRecord,
      title: t.settings.memory.markdown.topOfMind,
      fallbackSummary: user?.topOfMind.summary ?? "",
    },
  ];

  const cards = cardInputs.map(({ record, title, fallbackSummary }) => {
    const isActionable = Boolean(record?.memory_id);

    return {
      id: record?.memory_id ?? null,
      title,
      summary: record?.summary ?? fallbackSummary,
      status: record?.status ?? "active",
      sourceLabel: isActionable ? "真实记录" : "未绑定",
      sourceDescription: isActionable
        ? "当前卡片已绑定到真实 user_model record，下面的控制会直接作用到这条记录。"
        : "当前卡片仅展示汇总记忆，尚未绑定真实 user_model record，因此只能只读查看。",
      isActionable,
    };
  });

  async function handleFreeze(memoryId: string | null) {
    if (!memoryId) return;
    try {
      await freezeUserModel.mutateAsync(memoryId);
      toast.success("已冻结该用户画像项");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "冻结失败");
    }
  }

  async function handleForget(memoryId: string | null) {
    if (!memoryId) return;
    try {
      await forgetUserModel.mutateAsync(memoryId);
      toast.success("已提交遗忘请求");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "遗忘请求失败");
    }
  }

  async function handleReject(memoryId: string | null) {
    if (!memoryId) return;
    try {
      await rejectUserModel.mutateAsync(memoryId);
      toast.success("已拒绝该用户画像项");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "拒绝失败");
    }
  }

  async function handleCorrect(memoryId: string | null, currentSummary: string) {
    if (!memoryId) return;
    const nextSummary = window.prompt("请输入新的画像描述", currentSummary);
    if (!nextSummary || nextSummary.trim() === currentSummary.trim()) {
      return;
    }
    try {
      await correctUserModel.mutateAsync({ memoryId, summary: nextSummary.trim() });
      toast.success("已更新该用户画像项");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新失败");
    }
  }

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="border bg-background px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              User context
            </p>
            <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight">
              {t.settings.memory.markdown.userContext}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/workspace/memory/ledger">查看 ledger</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/workspace/memory/evidence">查看 evidence</Link>
            </Button>
          </div>
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="flex min-h-[420px] flex-col rounded-lg border bg-background p-5"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[1.05rem] font-semibold tracking-tight">
                  {card.title}
                </div>
                <Badge variant={card.isActionable ? "secondary" : "outline"}>
                  {card.sourceLabel}
                </Badge>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                {card.sourceDescription}
              </p>
            </div>
            <p className="mt-6 text-sm leading-8 text-muted-foreground">
              {card.summary || t.settings.memory.emptySectionText}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!card.isActionable}
                onClick={() => void handleCorrect(card.id, card.summary)}
              >
                修正
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!card.isActionable}
                onClick={() => void handleFreeze(card.id)}
              >
                冻结
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!card.isActionable}
                onClick={() => void handleForget(card.id)}
              >
                申请遗忘
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!card.isActionable}
                onClick={() => void handleReject(card.id)}
              >
                拒绝
              </Button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
