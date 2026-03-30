"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Streamdown } from "streamdown";

import { useI18n } from "@/core/i18n/hooks";
import type { UserMemory } from "@/core/memory/types";
import { streamdownPlugins } from "@/core/streamdown/plugins";
import { pathOfThread } from "@/core/threads/utils";
import { formatTimeAgo } from "@/core/utils/datetime";

type MemoryViewFilter = "all" | "facts" | "summaries";

type MemoryFact = UserMemory["facts"][number];

type MemorySection = {
  title: string;
  summary: string;
  updatedAt?: string;
};

type MemorySectionGroup = {
  title: string;
  sections: MemorySection[];
};

export function MemoryConsolePanel(props: {
  memory: UserMemory | null;
  isLoading: boolean;
  error: Error | null;
  draftQuery: string;
  submittedQuery: string;
  onDraftQueryChange: (value: string) => void;
  onSubmitSearch: () => void;
  structuredResults: Array<{
    id: string;
    title: string;
    snippet: string;
    updatedAt?: string;
  }>;
  recall: {
    results: Array<{
      thread_id: string;
      agent_name: string;
      snippet: string;
      created_at?: string;
    }>;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
  };
  overviewMarkdown: string;
  query: string;
  filter: MemoryViewFilter;
  filteredFacts: MemoryFact[];
  filteredSectionGroups: MemorySectionGroup[];
  hasMatchingVisibleContent: boolean;
  normalizedQuery: string;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: MemoryViewFilter) => void;
  onClearAll: () => void;
  onDeleteFact: (fact: MemoryFact) => void;
  clearPending: boolean;
}) {
  const { t } = useI18n();
  const showSummaries = props.filter !== "facts";
  const showFacts = props.filter !== "summaries";

  return (
    <div className="rounded-xl border bg-background/80 p-5 shadow-sm">
      <h3 className="text-base font-medium">
        {t.settings.memory.surfaces.console.title}
      </h3>
      <p className="text-muted-foreground mt-1 text-sm">
        {t.settings.memory.surfaces.console.description}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={t.settings.memory.searchPlaceholder}
            className="sm:max-w-xs"
          />
          <ToggleGroup
            type="single"
            value={props.filter}
            onValueChange={(value) => {
              if (value) props.onFilterChange(value as MemoryViewFilter);
            }}
            variant="outline"
          >
            <ToggleGroupItem value="all">
              {t.settings.memory.filterAll}
            </ToggleGroupItem>
            <ToggleGroupItem value="facts">
              {t.settings.memory.filterFacts}
            </ToggleGroupItem>
            <ToggleGroupItem value="summaries">
              {t.settings.memory.filterSummaries}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Button variant="destructive" disabled={props.clearPending} onClick={props.onClearAll}>
          {t.settings.memory.clearAll}
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Badge variant="secondary">{props.memory?.facts.length ?? 0}</Badge>
        <span className="text-muted-foreground text-sm">
          {t.settings.memory.recall.overviewTitle}
        </span>
      </div>

      <div className="mt-5 space-y-5">
        {!props.submittedQuery ? (
          <div className="text-muted-foreground text-sm">
            {t.settings.memory.recall.idle}
          </div>
        ) : (
          <>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                props.onSubmitSearch();
              }}
            >
              <Input
                placeholder={t.settings.memory.recall.placeholder}
                value={props.draftQuery}
                onChange={(event) => props.onDraftQueryChange(event.target.value)}
              />
              <Button type="submit">{t.settings.memory.recall.searchButton}</Button>
            </form>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">
                  {t.settings.memory.recall.structuredTitle}
                </h4>
                <Badge variant="secondary">{props.structuredResults.length}</Badge>
              </div>
              {props.structuredResults.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  {t.settings.memory.recall.structuredEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {props.structuredResults.map((result) => {
                    const updatedAtLabel = formatTimeAgo(result.updatedAt);

                    return (
                      <div
                        key={result.id}
                        className="rounded-md border bg-background p-3"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{result.title}</Badge>
                          {updatedAtLabel ? (
                            <span className="text-muted-foreground text-xs">
                              {updatedAtLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm leading-6">{result.snippet}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">
                  {t.settings.memory.recall.historyTitle}
                </h4>
                {!props.recall.isLoading &&
                !props.recall.isFetching &&
                !props.recall.error ? (
                  <Badge variant="secondary">{props.recall.results.length}</Badge>
                ) : null}
              </div>
              {props.recall.isLoading || props.recall.isFetching ? (
                <div className="text-muted-foreground text-sm">
                  {t.common.loading}
                </div>
              ) : props.recall.error ? (
                <div className="text-destructive text-sm">
                  {t.settings.memory.recall.loadFailed}
                </div>
              ) : props.recall.results.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  {t.settings.memory.recall.historyEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {props.recall.results.map((result, index) => {
                    const createdAtLabel = formatTimeAgo(result.created_at);

                    return (
                      <div
                        key={`${result.thread_id}-${result.agent_name}-${index}`}
                        className="rounded-md border bg-background p-3"
                      >
                        <div className="text-muted-foreground mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          <span>
                            {t.settings.memory.recall.threadLabel}:{" "}
                            {result.thread_id}
                          </span>
                          <span>
                            {t.settings.memory.recall.agentLabel}:{" "}
                            {result.agent_name}
                          </span>
                          {createdAtLabel ? <span>{createdAtLabel}</span> : null}
                        </div>
                        <p className="text-sm leading-6">{result.snippet}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 rounded-lg border p-4">
        {props.isLoading ? (
          <div className="text-muted-foreground text-sm">{t.common.loading}</div>
        ) : props.error ? (
          <div className="text-destructive text-sm">{props.error.message}</div>
        ) : !props.memory ? (
          <div className="text-muted-foreground text-sm">
            {t.settings.memory.empty}
          </div>
        ) : !props.hasMatchingVisibleContent && props.normalizedQuery ? (
          <div className="text-muted-foreground text-sm">
            {t.settings.memory.noMatches}
          </div>
        ) : (
          <div className="space-y-4">
            {showSummaries && props.filteredSectionGroups.length > 0 ? (
              <Streamdown
                className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                {...streamdownPlugins}
              >
                {props.overviewMarkdown}
              </Streamdown>
            ) : null}

            {showFacts ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">
                    {t.settings.memory.markdown.facts}
                  </h4>
                  <Badge variant="secondary">{props.filteredFacts.length}</Badge>
                </div>
                {props.filteredFacts.map((fact) => (
                    <div
                      key={fact.id}
                      className="flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                    <div className="min-w-0 space-y-2">
                      <p className="text-sm leading-6">{fact.content}</p>
                      <Link
                        href={pathOfThread(fact.source)}
                        className="text-primary text-sm underline-offset-4 hover:underline"
                      >
                        {t.settings.memory.markdown.table.view}
                      </Link>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => props.onDeleteFact(fact)}
                    >
                      {t.common.delete}
                      <span className="sr-only">{t.common.delete}</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
