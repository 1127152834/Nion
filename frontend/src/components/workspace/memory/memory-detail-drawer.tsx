"use client";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useI18n } from "@/core/i18n/hooks";
import type { UserMemory } from "@/core/memory/types";
import { formatTimeAgo } from "@/core/utils/datetime";

export type MemoryDetailKind = "user-context" | "history" | "facts";

function relatedSummaryTerms(summary: string) {
  return Array.from(
    new Set(
      summary
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2),
    ),
  );
}

export function MemoryDetailDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MemoryDetailKind;
  title: string;
  summary: string;
  updatedAt?: string;
  memory: UserMemory | null;
  facts: UserMemory["facts"];
}) {
  const { t } = useI18n();
  const summaryTerms = relatedSummaryTerms(props.summary);
  const relatedFacts = props.facts.filter((fact) => {
    if (props.kind === "history") {
      return false;
    }
    if (summaryTerms.length === 0) {
      return true;
    }
    const haystack = `${fact.content} ${fact.category}`.toLowerCase();
    return summaryTerms.some((term) => haystack.includes(term));
  });

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:max-w-[340px]">
        <SheetHeader className="border-b px-6 py-5">
          <div className="mb-1 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            Detail inspector
          </div>
          <SheetTitle className="text-[2rem] font-semibold tracking-tight">
            {props.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto px-6 py-6">
          <section className="border bg-background p-4">
            <div className="text-sm font-medium text-muted-foreground">
              {t.settings.memory.detailSummaryTitle}
            </div>
            <div className="mt-3 text-sm leading-7">
              {props.summary || t.settings.memory.emptySectionText}
            </div>
            {props.updatedAt ? (
              <div className="mt-3 text-xs text-muted-foreground">
                {formatTimeAgo(props.updatedAt)}
              </div>
            ) : null}
          </section>

          {props.kind === "history" ? (
            <section className="space-y-3">
              <div className="text-base font-semibold">
                {t.settings.memory.detailTimelineTitle}
              </div>
              <div className="space-y-3">
                {[
                  {
                    key: "recentMonths",
                    title: t.settings.memory.markdown.recentMonths,
                    summary: props.memory?.history.recentMonths.summary ?? "",
                    updatedAt: props.memory?.history.recentMonths.updatedAt,
                  },
                  {
                    key: "earlierContext",
                    title: t.settings.memory.markdown.earlierContext,
                    summary: props.memory?.history.earlierContext.summary ?? "",
                    updatedAt: props.memory?.history.earlierContext.updatedAt,
                  },
                  {
                    key: "longTermBackground",
                    title: t.settings.memory.markdown.longTermBackground,
                    summary: props.memory?.history.longTermBackground.summary ?? "",
                    updatedAt: props.memory?.history.longTermBackground.updatedAt,
                  },
                ].map((item) => (
                  <div key={item.key} className="relative pl-6">
                    <div className="absolute top-2 left-2 h-full w-px bg-border" />
                    <div className="relative border bg-background p-4">
                      <div className="absolute top-5 -left-[18px] size-3 rounded-full bg-primary" />
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.updatedAt
                          ? formatTimeAgo(item.updatedAt)
                          : t.settings.memory.notAvailable}
                      </div>
                      <div className="mt-2 text-sm leading-6">
                        {item.summary || t.settings.memory.emptySectionText}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {props.kind === "user-context" ? (
            <section className="space-y-3">
              <div className="text-base font-semibold">
                {t.settings.memory.detailFactsTitle}
              </div>
              <div className="grid gap-3">
                {[
                  {
                    key: "workContext",
                    title: t.settings.memory.markdown.work,
                    summary: props.memory?.user.workContext.summary ?? "",
                    updatedAt: props.memory?.user.workContext.updatedAt,
                  },
                  {
                    key: "personalContext",
                    title: t.settings.memory.markdown.personal,
                    summary: props.memory?.user.personalContext.summary ?? "",
                    updatedAt: props.memory?.user.personalContext.updatedAt,
                  },
                  {
                    key: "topOfMind",
                    title: t.settings.memory.markdown.topOfMind,
                    summary: props.memory?.user.topOfMind.summary ?? "",
                    updatedAt: props.memory?.user.topOfMind.updatedAt,
                  },
                ].map((item) => (
                  <div key={item.key} className="border bg-background p-4">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.updatedAt
                        ? formatTimeAgo(item.updatedAt)
                        : t.settings.memory.notAvailable}
                    </div>
                    <div className="mt-2 text-sm leading-6">
                      {item.summary || t.settings.memory.emptySectionText}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {props.kind !== "history" ? (
            <section className="space-y-3">
              <div className="text-base font-semibold">
                {t.settings.memory.detailFactsTitle}
              </div>
              {relatedFacts.length === 0 ? (
                <div className="border bg-background p-4 text-sm text-muted-foreground">
                  {t.settings.memory.noFacts}
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedFacts.map((fact) => (
                    <div key={fact.id} className="border bg-background p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{fact.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(fact.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm leading-6">{fact.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
