"use client";

import { useI18n } from "@/core/i18n/hooks";
import { useMemory } from "@/core/memory/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";

import { MemoryBackLink } from "./memory-back-link";

export function MemoryHistoryPage() {
  const { t } = useI18n();
  const { memory } = useMemory();

  const cards = [
    {
      title: t.settings.memory.markdown.recentMonths,
      summary: memory?.history.recentMonths.summary ?? "",
    },
    {
      title: t.settings.memory.markdown.earlierContext,
      summary: memory?.history.earlierContext.summary ?? "",
    },
    {
      title: t.settings.memory.markdown.longTermBackground,
      summary: memory?.history.longTermBackground.summary ?? "",
    },
  ];

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="border bg-background px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              History background
            </p>
            <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight">
              {t.settings.memory.markdown.historyBackground}
            </h1>
          </div>
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="rounded-lg border bg-background p-5">
            <div className="text-[1.05rem] font-semibold tracking-tight">
              {card.title}
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {card.summary || t.settings.memory.emptySectionText}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
