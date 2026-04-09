"use client";

import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";
import { useMemory } from "@/core/memory/hooks";
import {
  searchStructuredMemory,
  type StructuredMemorySearchLabels,
} from "@/core/memory/search";
import {
  pathOfMemory,
  pathOfMemorySearch,
  pathOfMemorySearchResults,
} from "@/core/navigation/desktop-routes";
import { useRecallSearch } from "@/core/recall/hooks";
import { pathOfThread } from "@/core/threads/utils";
import { formatTimeAgo } from "@/core/utils/datetime";

import { MemoryBackLink } from "./memory-back-link";

type SearchFilter = "all" | "memory" | "history";

type SearchResultItem =
  | {
      id: string;
      source: "memory";
      title: string;
      snippet: string;
      meta: string | null;
    }
  | {
      id: string;
      source: "history";
      title: string;
      snippet: string;
      meta: string | null;
      threadId: string;
    };

export function MemorySearchResultsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const [draftQuery, setDraftQuery] = useState(query);
  const [filter, setFilter] = useState<SearchFilter>("all");
  const { memory, isLoading: isMemoryLoading, error: memoryError } = useMemory();
  const recall = useRecallSearch(query, 8);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  const searchLabels = useMemo<StructuredMemorySearchLabels>(
    () => ({
      userProfile: t.settings.memory.markdown.userContext,
      longTermBackground: t.settings.memory.markdown.historyBackground,
      facts: t.settings.memory.markdown.facts,
    }),
    [
      t.settings.memory.markdown.userContext,
      t.settings.memory.markdown.historyBackground,
      t.settings.memory.markdown.facts,
    ],
  );

  const structuredResults = useMemo(
    () => (memory && query ? searchStructuredMemory(memory, query, searchLabels) : []),
    [memory, query, searchLabels],
  );

  const resultItems = useMemo<SearchResultItem[]>(() => {
    const memoryItems: SearchResultItem[] = structuredResults.map((result) => ({
      id: `memory-${result.id}`,
      source: "memory",
      title: result.title,
      snippet: result.snippet,
      meta: result.updatedAt ? formatTimeAgo(result.updatedAt) : null,
    }));
    const historyItems: SearchResultItem[] = recall.results.map((result, index) => ({
      id: `history-${result.thread_id}-${index}`,
      source: "history",
      title: `${t.settings.memory.recall.threadLabel} ${result.thread_id}`,
      snippet: result.snippet,
      meta: [result.agent_name, formatTimeAgo(result.created_at)]
        .filter(Boolean)
        .join(" · "),
      threadId: result.thread_id,
    }));
    return [...memoryItems, ...historyItems];
  }, [recall.results, structuredResults, t.settings.memory.recall.threadLabel]);

  const visibleItems = useMemo(
    () =>
      resultItems.filter((item) => {
        if (filter === "all") return true;
        return item.source === filter;
      }),
    [filter, resultItems],
  );

  function submitQuery(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;
    router.push(pathOfMemorySearchResults(trimmed));
  }

  return (
    <main className="flex size-full min-h-0 flex-col overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 border-b border-border/70 pb-5">
          <div className="flex items-center justify-between gap-4">
            <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
            <Link
              href={pathOfMemorySearch()}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.settings.memory.recall.backToSearchHome}
            </Link>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Link
              href={pathOfMemorySearch()}
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              {t.settings.memory.recall.title}
            </Link>
            <form
              className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center"
              onSubmit={(event) => {
                event.preventDefault();
                submitQuery(draftQuery);
              }}
            >
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder={t.settings.memory.recall.placeholder}
                  className="h-11 rounded-full border-border/70 bg-background pl-11 text-sm"
                />
              </div>
              <Button
                type="submit"
                className="h-10 rounded-full px-5"
                disabled={draftQuery.trim().length === 0}
              >
                {t.settings.memory.recall.searchButton}
              </Button>
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            {(
              [
                ["all", t.settings.memory.filterAll],
                ["memory", t.settings.memory.recall.filterMemory],
                ["history", t.settings.memory.recall.filterHistory],
              ] as const
            ).map(([value, label]) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`relative pb-2 transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <span
                    className={`absolute inset-x-0 -bottom-px h-0.5 bg-foreground transition-transform duration-200 ease-out ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {!query ? (
          <div className="border border-dashed border-border/70 px-5 py-8 text-sm text-muted-foreground">
            {t.settings.memory.recall.emptyQuery}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {t.settings.memory.recall.resultsCount(visibleItems.length)}
            </div>

            <section className="space-y-5">
              {isMemoryLoading || recall.isLoading || recall.isFetching ? (
                <div className="text-sm text-muted-foreground">{t.common.loading}</div>
              ) : memoryError ? (
                <div className="text-sm text-destructive">
                  {memoryError instanceof Error ? memoryError.message : String(memoryError)}
                </div>
              ) : recall.error ? (
                <div className="text-sm text-destructive">
                  {t.settings.memory.recall.loadFailed}
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="border border-dashed border-border/70 px-5 py-8 text-sm text-muted-foreground">
                  {t.settings.memory.recall.empty}
                </div>
              ) : (
                visibleItems.map((item) => (
                  <article
                    key={item.id}
                    className="border-b border-border/70 pb-5 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md border border-border/70 px-2 py-1">
                        {item.source === "memory"
                          ? t.settings.memory.recall.structuredTitle
                          : t.settings.memory.recall.historyTitle}
                      </span>
                      {item.meta ? <span>{item.meta}</span> : null}
                    </div>
                    <div className="mt-3 text-[1.05rem] font-semibold tracking-tight text-foreground">
                      {item.title}
                    </div>
                    <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
                      {item.snippet}
                    </p>
                    {item.source === "history" ? (
                      <div className="mt-3">
                        <Link
                          href={pathOfThread(item.threadId)}
                          className="text-sm text-foreground transition-colors hover:text-muted-foreground"
                        >
                          {t.settings.memory.recall.openThread}
                        </Link>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
