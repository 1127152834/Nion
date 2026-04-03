"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";
import {
  pathOfMemory,
  pathOfMemorySearchResults,
} from "@/core/navigation/desktop-routes";

import { MemoryBackLink } from "./memory-back-link";

export function MemorySearchPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [draftQuery, setDraftQuery] = useState("");

  const suggestionQueries = [
    t.settings.memory.recall.suggestProject,
    t.settings.memory.recall.suggestPreference,
    t.settings.memory.recall.suggestHistory,
  ];

  function submitQuery(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(pathOfMemorySearchResults(trimmed));
  }

  return (
    <main className="flex size-full min-h-0 flex-col overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />

        <section className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-8 py-6">
          <div className="space-y-4 text-center">
            <p className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Memory
            </p>
            <h1 className="text-[clamp(2.75rem,7vw,4.5rem)] font-semibold tracking-[-0.06em] text-foreground">
              {t.settings.memory.recall.title}
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {t.settings.memory.recall.description}
            </p>
          </div>

          <form
            className="w-full max-w-3xl"
            onSubmit={(event) => {
              event.preventDefault();
              submitQuery(draftQuery);
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder={t.settings.memory.recall.placeholder}
                  className="h-12 rounded-full border-border/70 bg-background pl-11 text-sm shadow-sm sm:text-base"
                />
              </div>
              <Button
                type="submit"
                className="h-11 rounded-full px-5"
                disabled={draftQuery.trim().length === 0}
              >
                {t.settings.memory.recall.searchButton}
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {suggestionQueries.map((query) => (
              <button
                key={query}
                type="button"
                className="rounded-md border border-border/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => submitQuery(query)}
              >
                {query}
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
