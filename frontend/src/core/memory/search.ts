import type { UserMemory } from "./types";

export type StructuredMemorySearchLabels = {
  work: string;
  personal: string;
  topOfMind: string;
  recentMonths: string;
  earlierContext: string;
  longTermBackground: string;
  facts: string;
};

export type StructuredMemorySearchResult = {
  id: string;
  kind: "section" | "fact";
  title: string;
  snippet: string;
  updatedAt?: string;
  confidence?: number;
  source?: string;
};

type SearchableEntry = {
  id: string;
  kind: "section" | "fact";
  title: string;
  content: string;
  updatedAt?: string;
  confidence?: number;
  source?: string;
  scoreBoost?: number;
};

function normalizeQuery(query: string) {
  const compact = query.trim().toLowerCase();
  if (!compact) {
    return { compact: "", terms: [] as string[] };
  }

  const splitTerms = compact
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  return {
    compact,
    terms: Array.from(new Set([compact, ...splitTerms])),
  };
}

function scoreEntry(entry: SearchableEntry, compact: string, terms: string[]) {
  const haystack = `${entry.title} ${entry.content}`.toLowerCase();

  if (!haystack.includes(compact) && !terms.some((term) => haystack.includes(term))) {
    return -1;
  }

  let score = entry.scoreBoost ?? 0;
  if (haystack.includes(compact)) {
    score += 6;
  }
  for (const term of terms) {
    if (haystack.includes(term)) {
      score += term === compact ? 3 : 1;
    }
  }
  if (typeof entry.confidence === "number") {
    score += entry.confidence;
  }
  return score;
}

function buildSnippet(content: string, compact: string, terms: string[]) {
  const target =
    [compact, ...terms].find((term) => term && content.toLowerCase().includes(term)) ??
    "";

  if (!target) {
    return content;
  }

  const lower = content.toLowerCase();
  const matchIndex = lower.indexOf(target);
  if (matchIndex < 0 || content.length <= 96) {
    return content;
  }

  const start = Math.max(0, matchIndex - 24);
  const end = Math.min(content.length, matchIndex + target.length + 48);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";
  return `${prefix}${content.slice(start, end)}${suffix}`;
}

function getSearchableEntries(
  memory: UserMemory,
  labels: StructuredMemorySearchLabels,
): SearchableEntry[] {
  return [
    {
      id: "workContext",
      kind: "section" as const,
      title: labels.work,
      content: memory.user.workContext.summary,
      updatedAt: memory.user.workContext.updatedAt,
      scoreBoost: 0.4,
    },
    {
      id: "personalContext",
      kind: "section" as const,
      title: labels.personal,
      content: memory.user.personalContext.summary,
      updatedAt: memory.user.personalContext.updatedAt,
      scoreBoost: 0.2,
    },
    {
      id: "topOfMind",
      kind: "section" as const,
      title: labels.topOfMind,
      content: memory.user.topOfMind.summary,
      updatedAt: memory.user.topOfMind.updatedAt,
      scoreBoost: 0.3,
    },
    {
      id: "recentMonths",
      kind: "section" as const,
      title: labels.recentMonths,
      content: memory.history.recentMonths.summary,
      updatedAt: memory.history.recentMonths.updatedAt,
      scoreBoost: 0.1,
    },
    {
      id: "earlierContext",
      kind: "section" as const,
      title: labels.earlierContext,
      content: memory.history.earlierContext.summary,
      updatedAt: memory.history.earlierContext.updatedAt,
    },
    {
      id: "longTermBackground",
      kind: "section" as const,
      title: labels.longTermBackground,
      content: memory.history.longTermBackground.summary,
      updatedAt: memory.history.longTermBackground.updatedAt,
    },
    ...memory.facts.map((fact) => ({
      id: fact.id,
      kind: "fact" as const,
      title: labels.facts,
      content: fact.content,
      updatedAt: fact.createdAt,
      confidence: fact.confidence,
      source: fact.source,
      scoreBoost: 0.5,
    })),
  ].filter((entry) => entry.content.trim().length > 0);
}

export function searchStructuredMemory(
  memory: UserMemory,
  query: string,
  labels: StructuredMemorySearchLabels,
): StructuredMemorySearchResult[] {
  const { compact, terms } = normalizeQuery(query);
  if (!compact) {
    return [];
  }

  return getSearchableEntries(memory, labels)
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, compact, terms),
    }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => {
      if (left.entry.kind !== right.entry.kind) {
        return left.entry.kind === "section" ? -1 : 1;
      }
      return right.score - left.score;
    })
    .map(({ entry }) => ({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      snippet: buildSnippet(entry.content, compact, terms),
      updatedAt: entry.updatedAt,
      confidence: entry.confidence,
      source: entry.source,
    }));
}
