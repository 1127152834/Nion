"use client";

import { Streamdown } from "streamdown";

import { useI18n } from "@/core/i18n/hooks";
import { useMemory } from "@/core/memory/hooks";
import type { UserMemory } from "@/core/memory/types";
import { streamdownPlugins } from "@/core/streamdown/plugins";
import { pathOfThread } from "@/core/threads/utils";
import { formatTimeAgo } from "@/core/utils/datetime";

import { SettingsSection } from "./settings-section";

function confidenceToLevelKey(confidence: unknown): {
  key: "veryHigh" | "high" | "normal" | "unknown";
} {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return { key: "unknown" };
  }

  const value = Math.min(1, Math.max(0, confidence));
  if (value >= 0.85) return { key: "veryHigh" };
  if (value >= 0.65) return { key: "high" };
  return { key: "normal" };
}

function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
    [
      `### ${t.settings.memory.markdown.work}`,
      memory.user.workContext.summary || "-",
    ].join("\n"),
  );
  parts.push(
    [
      `### ${t.settings.memory.markdown.personal}`,
      memory.user.personalContext.summary || "-",
    ].join("\n"),
  );
  parts.push(
    [
      `### ${t.settings.memory.markdown.topOfMind}`,
      memory.user.topOfMind.summary || "-",
    ].join("\n"),
  );

  parts.push(`\n## ${t.settings.memory.markdown.historyBackground}`);
  parts.push(
    [
      `### ${t.settings.memory.markdown.recentMonths}`,
      memory.history.recentMonths.summary || "-",
    ].join("\n"),
  );
  parts.push(
    [
      `### ${t.settings.memory.markdown.earlierContext}`,
      memory.history.earlierContext.summary || "-",
    ].join("\n"),
  );
  parts.push(
    [
      `### ${t.settings.memory.markdown.longTermBackground}`,
      memory.history.longTermBackground.summary || "-",
    ].join("\n"),
  );

  parts.push(`\n## ${t.settings.memory.markdown.facts}`);
  if (memory.facts.length === 0) {
    parts.push(`_${t.settings.memory.markdown.empty}_`);
  } else {
    parts.push(
      [
        `| ${t.settings.memory.markdown.table.category} | ${t.settings.memory.markdown.table.confidence} | ${t.settings.memory.markdown.table.content} | ${t.settings.memory.markdown.table.source} | ${t.settings.memory.markdown.table.createdAt} |`,
        "|---|---|---|---|---|",
        ...memory.facts.map((fact) => {
          const confidenceLabel =
            t.settings.memory.markdown.table.confidenceLevel[
              confidenceToLevelKey(fact.confidence).key
            ];
          return `| ${upperFirst(fact.category)} | ${confidenceLabel} | ${fact.content} | [${t.settings.memory.markdown.table.view}](${pathOfThread(fact.source)}) | ${formatTimeAgo(fact.createdAt)} |`;
        }),
      ].join("\n"),
    );
  }

  return parts.join("\n\n");
}

export function MemorySettingsPage() {
  const { t } = useI18n();
  const { memory, isLoading, error } = useMemory();

  return (
    <SettingsSection
      title={t.settings.memory.title}
      description={t.settings.memory.description}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error.message}</div>
      ) : !memory ? (
        <div className="text-muted-foreground text-sm">
          {t.settings.memory.empty}
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          <Streamdown
            className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            {...streamdownPlugins}
          >
            {memoryToMarkdown(memory, t)}
          </Streamdown>
        </div>
      )}
    </SettingsSection>
  );
}
