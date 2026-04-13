"use client";

import { useCreateKnowledgeRevision } from "@/core/knowledge";

export function KnowledgeRevisionDialog() {
  const createRevision = useCreateKnowledgeRevision();

  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="space-y-3">
        <h2 className="text-[1.1rem] font-semibold tracking-tight">revision request</h2>
        <p className="text-sm text-muted-foreground">
          Create a revision request instead of editing the compiled page directly.
        </p>
        <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          fix_fact / add_context / merge_pages / split_page / rename_page
        </div>
        <button
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() =>
            createRevision.mutate({
              page_id: "concept:roadmap",
              request_type: "fix_fact",
              instruction: "Fix owner",
              optional_source_refs: [],
            })
          }
        >
          submit revision
        </button>
      </div>
    </section>
  );
}
