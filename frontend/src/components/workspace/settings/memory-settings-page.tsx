"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Streamdown } from "streamdown";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";
import { useMemory } from "@/core/memory/hooks";
import {
  searchStructuredMemory,
  type StructuredMemorySearchLabels,
} from "@/core/memory/search";
import type { UserMemory } from "@/core/memory/types";
import { useRecallSearch } from "@/core/recall/hooks";
import { streamdownPlugins } from "@/core/streamdown/plugins";
import { pathOfThread } from "@/core/threads/utils";
import { formatTimeAgo } from "@/core/utils/datetime";

import { SettingsSection } from "./settings-section";

function confidenceToLevelKey(confidence: unknown): {
  key: "veryHigh" | "high" | "normal" | "unknown";
  value?: number;
} {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return { key: "unknown" };
  }

  // Clamp to [0, 1] since confidence is expected to be a probability-like score.
  const value = Math.min(1, Math.max(0, confidence));

  // 3 levels:
  // - veryHigh: [0.85, 1]
  // - high:     [0.65, 0.85)
  // - normal:   [0, 0.65)
  if (value >= 0.85) return { key: "veryHigh", value };
  if (value >= 0.65) return { key: "high", value };
  return { key: "normal", value };
}

function formatMemorySection(
  title: string,
  summary: string,
  updatedAt: string | undefined,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const updatedAtLabel = formatTimeAgo(updatedAt);
  const content =
    summary.trim() ||
    `<span class="text-muted-foreground">${t.settings.memory.markdown.empty}</span>`;
  return [
    `### ${title}`,
    content,
    "",
    updatedAtLabel &&
      `> ${t.settings.memory.markdown.updatedAt}: \`${updatedAtLabel}\``,
  ]
    .filter(Boolean)
    .join("\n");
}

function memoryToMarkdown(
  memory: UserMemory,
  t: ReturnType<typeof useI18n>["t"],
) {
  const parts: string[] = [];
  const lastUpdatedLabel = formatTimeAgo(memory.lastUpdated);

  parts.push(`## ${t.settings.memory.markdown.overview}`);
  if (lastUpdatedLabel) {
    parts.push(`- **${t.common.lastUpdated}**: \`${lastUpdatedLabel}\``);
  }

  parts.push(`\n## ${t.settings.memory.markdown.userContext}`);
  parts.push(
    formatMemorySection(
      t.settings.memory.markdown.work,
      memory.user.workContext.summary,
      memory.user.workContext.updatedAt,
      t,
    ),
  );
  parts.push(
    formatMemorySection(
      t.settings.memory.markdown.personal,
      memory.user.personalContext.summary,
      memory.user.personalContext.updatedAt,
      t,
    ),
  );
  parts.push(
    formatMemorySection(
      t.settings.memory.markdown.topOfMind,
      memory.user.topOfMind.summary,
      memory.user.topOfMind.updatedAt,
      t,
    ),
  );

  parts.push(`\n## ${t.settings.memory.markdown.historyBackground}`);
  parts.push(
    formatMemorySection(
      t.settings.memory.markdown.recentMonths,
      memory.history.recentMonths.summary,
      memory.history.recentMonths.updatedAt,
      t,
    ),
  );
  parts.push(
    formatMemorySection(
      t.settings.memory.markdown.earlierContext,
      memory.history.earlierContext.summary,
      memory.history.earlierContext.updatedAt,
      t,
    ),
  );
  parts.push(
    formatMemorySection(
      t.settings.memory.markdown.longTermBackground,
      memory.history.longTermBackground.summary,
      memory.history.longTermBackground.updatedAt,
      t,
    ),
  );

  parts.push(`\n## ${t.settings.memory.markdown.facts}`);
  if (memory.facts.length === 0) {
    parts.push(
      `<span class="text-muted-foreground">${t.settings.memory.markdown.empty}</span>`,
    );
  } else {
    parts.push(
      [
        `| ${t.settings.memory.markdown.table.category} | ${t.settings.memory.markdown.table.confidence} | ${t.settings.memory.markdown.table.content} | ${t.settings.memory.markdown.table.source} | ${t.settings.memory.markdown.table.createdAt} |`,
        "|---|---|---|---|---|",
        ...memory.facts.map((f) => {
          const { key, value } = confidenceToLevelKey(f.confidence);
          const levelLabel =
            t.settings.memory.markdown.table.confidenceLevel[key];
          const confidenceText =
            typeof value === "number" ? `${levelLabel}` : levelLabel;
          const createdAtLabel = formatTimeAgo(f.createdAt) || "-";
          return `| ${upperFirst(f.category)} | ${confidenceText} | ${f.content} | [${t.settings.memory.markdown.table.view}](${pathOfThread(f.source)}) | ${createdAtLabel} |`;
        }),
      ].join("\n"),
    );
  }

  const markdown = parts.join("\n\n");

  // Ensure every level-2 heading (##) is preceded by a horizontal rule.
  const lines = markdown.split("\n");
  const out: string[] = [];
  let i = 0;
  for (const line of lines) {
    i++;
    if (i !== 1 && line.startsWith("## ")) {
      if (out.length === 0 || out[out.length - 1] !== "---") {
        out.push("---");
      }
    }
    out.push(line);
  }

  return out.join("\n");
}

export function MemorySettingsPage() {
  const { t } = useI18n();
  const { memory, isLoading, error } = useMemory();
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const recall = useRecallSearch(submittedQuery, 5);
  const searchLabels = useMemo<StructuredMemorySearchLabels>(
    () => ({
      work: t.settings.memory.markdown.work,
      personal: t.settings.memory.markdown.personal,
      topOfMind: t.settings.memory.markdown.topOfMind,
      recentMonths: t.settings.memory.markdown.recentMonths,
      earlierContext: t.settings.memory.markdown.earlierContext,
      longTermBackground: t.settings.memory.markdown.longTermBackground,
      facts: t.settings.memory.markdown.facts,
    }),
    [
      t.settings.memory.markdown.work,
      t.settings.memory.markdown.personal,
      t.settings.memory.markdown.topOfMind,
      t.settings.memory.markdown.recentMonths,
      t.settings.memory.markdown.earlierContext,
      t.settings.memory.markdown.longTermBackground,
      t.settings.memory.markdown.facts,
    ],
  );
  const structuredResults = useMemo(
    () =>
      memory && submittedQuery
        ? searchStructuredMemory(memory, submittedQuery, searchLabels)
        : [],
    [memory, submittedQuery, searchLabels],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(draftQuery.trim());
  }

  return (
    <SettingsSection
      title={t.settings.memory.title}
      description={t.settings.memory.description}
    >
      <div className="rounded-xl border bg-muted/20 p-5 sm:p-6">
        <div className="space-y-1">
          <h3 className="text-base font-medium">
            {t.settings.memory.recall.title}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t.settings.memory.recall.description}
          </p>
        </div>
        <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
          <Input
            placeholder={t.settings.memory.recall.placeholder}
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <Button type="submit">{t.settings.memory.recall.searchButton}</Button>
        </form>
        <div className="mt-5 space-y-5">
          {!submittedQuery ? (
            <div className="text-muted-foreground text-sm">
              {t.settings.memory.recall.idle}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">
                    {t.settings.memory.recall.structuredTitle}
                  </h4>
                  <Badge variant="secondary">{structuredResults.length}</Badge>
                </div>
                {structuredResults.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    {t.settings.memory.recall.structuredEmpty}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {structuredResults.map((result) => {
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
                  {!recall.isLoading && !recall.isFetching && !recall.error ? (
                    <Badge variant="secondary">{recall.results.length}</Badge>
                  ) : null}
                </div>
                {recall.isLoading || recall.isFetching ? (
                  <div className="text-muted-foreground text-sm">
                    {t.common.loading}
                  </div>
                ) : recall.error ? (
                  <div className="text-destructive text-sm">
                    {t.settings.memory.recall.loadFailed}
                  </div>
                ) : recall.results.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    {t.settings.memory.recall.historyEmpty}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recall.results.map((result, index) => {
                      const createdAtLabel = formatTimeAgo(result.created_at);

                      return (
                        <div
                          key={`${result.thread_id}-${result.agent_name}-${index}`}
                          className="rounded-md border bg-background p-3"
                        >
                          <div className="text-muted-foreground mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            <span>
                              {t.settings.memory.recall.threadLabel}: {result.thread_id}
                            </span>
                            <span>
                              {t.settings.memory.recall.agentLabel}: {result.agent_name}
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
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="text-base font-medium">
          {t.settings.memory.recall.overviewTitle}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t.settings.memory.recall.overviewDescription}
        </p>
      </div>
      <div className="mt-4 rounded-lg border p-4">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">{t.common.loading}</div>
        ) : error ? (
          <div className="text-destructive text-sm">{error.message}</div>
        ) : !memory ? (
          <div className="text-muted-foreground text-sm">
            {t.settings.memory.empty}
          </div>
        ) : (
          <Streamdown
            className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            {...streamdownPlugins}
          >
            {memoryToMarkdown(memory, t)}
          </Streamdown>
        )}
      </div>
    </SettingsSection>
  );
}

function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
