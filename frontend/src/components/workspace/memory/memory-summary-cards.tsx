"use client";

import { useI18n } from "@/core/i18n/hooks";
import type { MemoryUserFacing } from "@/core/memory/types";
import { formatTimeAgo } from "@/core/utils/datetime";

function hasMeaningfulContent(values: Array<{ content: string }>) {
  return values.some((item) => item.content.trim() !== "");
}

export function MemorySummaryCards(props: { memory: MemoryUserFacing | null }) {
  const { t } = useI18n();
  const memory = props.memory;

  const userProfileCount = memory
    ? memory.user_profile.filter((item) => item.content.trim() !== "").length
    : 0;

  const longTermBackgroundCount = memory
    ? memory.long_term_background.filter((item) => item.content.trim() !== "").length
    : 0;

  const lastUpdated = memory
    ? [
        ...memory.user_profile,
        ...memory.long_term_background,
        ...memory.fact_memories,
      ]
        .map((item) => item.updated_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null
    : null;

  const cards = [
    {
      label: t.settings.memory.summaryCards.factCount,
      value: String(memory?.fact_memories.length ?? 0),
    },
    {
      label: t.settings.memory.summaryCards.lastUpdated,
      value: formatTimeAgo(lastUpdated) ?? t.settings.memory.notAvailable,
    },
    {
      label: t.settings.memory.summaryCards.userProfile,
      value: String(userProfileCount),
    },
    {
      label: t.settings.memory.summaryCards.longTermBackground,
      value: String(longTermBackgroundCount),
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-md border border-[color:var(--border)] px-4 py-4"
        >
          <div className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {card.label}
          </div>
          <div className="mt-3 text-[2rem] leading-none font-semibold tracking-tight">
            {card.value}
          </div>
        </article>
      ))}
    </div>
  );
}
