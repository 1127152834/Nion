"use client";

import { toast } from "sonner";

import { useI18n } from "@/core/i18n/hooks";
import { useMemory } from "@/core/memory/hooks";
import {
  useForgetUserModelItem,
  useFreezeUserModelItem,
  useUserModelItems,
} from "@/core/memory-growth/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";

import { MemoryBackLink } from "./memory-back-link";

export function MemoryUserPage() {
  const { t } = useI18n();
  const { memory } = useMemory();
  const { items } = useUserModelItems();
  const freezeUserModel = useFreezeUserModelItem();
  const forgetUserModel = useForgetUserModelItem();

  const workRecord = items.find((item) => item.subtype === "workContext");
  const personalRecord = items.find((item) => item.subtype === "personalContext");
  const topOfMindRecord = items.find((item) => item.subtype === "topOfMind");

  const cards = [
    {
      id: workRecord?.memory_id ?? "user-work",
      title: t.settings.memory.markdown.work,
      summary: workRecord?.summary ?? memory?.user.workContext.summary ?? "",
    },
    {
      id: personalRecord?.memory_id ?? "user-personal",
      title: t.settings.memory.markdown.personal,
      summary:
        personalRecord?.summary ?? memory?.user.personalContext.summary ?? "",
    },
    {
      id: topOfMindRecord?.memory_id ?? "user-top-of-mind",
      title: t.settings.memory.markdown.topOfMind,
      summary: topOfMindRecord?.summary ?? memory?.user.topOfMind.summary ?? "",
    },
  ];

  async function handleFreeze(memoryId: string) {
    try {
      await freezeUserModel.mutateAsync(memoryId);
      toast.success("已冻结该用户画像项");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "冻结失败");
    }
  }

  async function handleForget(memoryId: string) {
    try {
      await forgetUserModel.mutateAsync(memoryId);
      toast.success("已提交遗忘请求");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "遗忘请求失败");
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
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="flex min-h-[420px] flex-col rounded-lg border bg-background p-5"
          >
            <div className="text-[1.05rem] font-semibold tracking-tight">
              {card.title}
            </div>
            <p className="mt-6 text-sm leading-8 text-muted-foreground">
              {card.summary || t.settings.memory.emptySectionText}
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs text-foreground"
                onClick={() => void handleFreeze(card.id)}
              >
                冻结
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs text-foreground"
                onClick={() => void handleForget(card.id)}
              >
                申请遗忘
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
