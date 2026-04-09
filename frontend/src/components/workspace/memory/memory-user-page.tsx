"use client";

import { useI18n } from "@/core/i18n/hooks";
import { useMemoryUserSurface } from "@/core/memory-canonical/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";

import { MemoryBackLink } from "./memory-back-link";

export function MemoryUserPage() {
  const { t } = useI18n();
  const { user } = useMemoryUserSurface();

  const cards = [
    {
      title: t.settings.memory.markdown.work,
      summary: user?.workContext.summary ?? "",
    },
    {
      title: t.settings.memory.markdown.personal,
      summary: user?.personalContext.summary ?? "",
    },
    {
      title: t.settings.memory.markdown.topOfMind,
      summary: user?.topOfMind.summary ?? "",
    },
  ];

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="border bg-background px-6 py-5">
        <div className="space-y-2">
          <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            User Profile
          </p>
          <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight">
            {t.settings.memory.markdown.userContext}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            这里只读展示当前用户画像。如果其中有误，直接告诉我：这条记错了，或别再记这个。
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-lg border bg-background p-5"
          >
            <div className="text-[1.05rem] font-semibold tracking-tight">{card.title}</div>
            <p className="mt-4 text-sm leading-8 text-muted-foreground">
              {card.summary || t.settings.memory.emptySectionText}
            </p>
            <p className="mt-6 text-xs leading-6 text-muted-foreground">
              如果这条记错了，直接告诉我：这条记错了，或别再记这个。
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
