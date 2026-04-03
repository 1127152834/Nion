"use client";

import Link from "next/link";

import { useI18n } from "@/core/i18n/hooks";
import { useMemory } from "@/core/memory/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";

export function MemoryUserPage() {
  const { t } = useI18n();
  const { memory } = useMemory();

  const cards = [
    {
      title: t.settings.memory.markdown.work,
      summary: memory?.user.workContext.summary ?? "",
    },
    {
      title: t.settings.memory.markdown.personal,
      summary: memory?.user.personalContext.summary ?? "",
    },
    {
      title: t.settings.memory.markdown.topOfMind,
      summary: memory?.user.topOfMind.summary ?? "",
    },
  ];

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="border bg-background px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              User context
            </p>
            <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight">
              {t.settings.memory.markdown.userContext}
            </h1>
          </div>
          <Link
            href={pathOfMemory()}
            className="rounded-md border bg-background px-3 py-2 text-sm font-medium"
          >
            返回记忆首页
          </Link>
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
          </article>
        ))}
      </section>
    </main>
  );
}
