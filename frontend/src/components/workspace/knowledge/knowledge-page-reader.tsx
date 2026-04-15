"use client";

import { useI18n } from "@/core/i18n/hooks";
import { MarkdownContent } from "../messages/markdown-content";
import type { KnowledgePage } from "@/core/knowledge";

export function KnowledgePageReader(props: { page: KnowledgePage | null }) {
  const { t } = useI18n();
  const copy = t.knowledgePage.page;
  if (!props.page) {
    return (
      <div className="rounded-lg border border-dashed bg-background px-5 py-6 text-sm text-muted-foreground">
        {copy.empty}
      </div>
    );
  }

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {copy.compiled}
            </div>
            <h1 className="mt-2 text-[1.5rem] font-semibold tracking-tight">
              {props.page.title}
            </h1>
          </div>
          <div className="text-xs text-muted-foreground">{copy.revisionRequest}</div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          {copy.lastCompiledAt} {props.page.last_compiled_at}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {copy.sources}
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          {props.page.sources.map((source) => (
            <div key={source}>{source}</div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <MarkdownContent
          content={props.page.body}
          isLoading={false}
          rehypePlugins={[]}
        />
      </section>
    </main>
  );
}
