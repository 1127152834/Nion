"use client";

import { useI18n } from "@/core/i18n/hooks";
import { KnowledgePageReader } from "./knowledge-page-reader";
import { useKnowledgePage } from "@/core/knowledge";

export function KnowledgePageDetailRoute(props: { pageId: string }) {
  const { t } = useI18n();
  const copy = t.knowledgePage.page;
  const { page, isLoading, error } = useKnowledgePage(props.pageId);

  if (isLoading) {
    return (
      <main className="flex size-full min-h-0 flex-col overflow-y-auto px-4 py-6 sm:px-6">
        <div className="rounded-lg border border-dashed bg-background px-5 py-6 text-sm text-muted-foreground">
          {copy.loading}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex size-full min-h-0 flex-col overflow-y-auto px-4 py-6 sm:px-6">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : copy.loadErrorFallback}
        </div>
      </main>
    );
  }

  return <KnowledgePageReader page={page} />;
}
