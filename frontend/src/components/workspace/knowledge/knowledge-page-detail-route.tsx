"use client";

import { KnowledgePageReader } from "./knowledge-page-reader";
import { useKnowledgePage } from "@/core/knowledge";

export function KnowledgePageDetailRoute(props: { pageId: string }) {
  const { page, isLoading, error } = useKnowledgePage(props.pageId);

  if (isLoading) {
    return (
      <main className="flex size-full min-h-0 flex-col overflow-y-auto px-4 py-6 sm:px-6">
        <div className="rounded-lg border border-dashed bg-background px-5 py-6 text-sm text-muted-foreground">
          Loading knowledge page…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex size-full min-h-0 flex-col overflow-y-auto px-4 py-6 sm:px-6">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Knowledge page failed to load"}
        </div>
      </main>
    );
  }

  return <KnowledgePageReader page={page} />;
}
