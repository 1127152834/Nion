"use client";

import { useI18n } from "@/core/i18n/hooks";
import {
  useApplyKnowledgeRevision,
  useCloseKnowledgeRevision,
  useCreateKnowledgeRevision,
  usePreviewKnowledgeRevision,
} from "@/core/knowledge";

export function KnowledgeRevisionDialog() {
  const { t } = useI18n();
  const copy = t.knowledgePage.revision;
  const createRevision = useCreateKnowledgeRevision();
  const previewRevision = usePreviewKnowledgeRevision();
  const applyRevision = useApplyKnowledgeRevision();
  const closeRevision = useCloseKnowledgeRevision();

  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="space-y-3">
        <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.title}</h2>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
        <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          {copy.requestTypes}
        </div>
        <button
          className="rounded-md border px-3 py-2 text-sm"
          onClick={async () => {
            const created = await createRevision.mutateAsync({
              page_id: "concept:roadmap",
              request_type: "fix_fact",
              instruction: "Fix owner",
              optional_source_refs: [],
            });
            await previewRevision.mutateAsync(created.request_id);
            await applyRevision.mutateAsync(created.request_id);
            await closeRevision.mutateAsync(created.request_id);
          }}
        >
          {copy.submit}
        </button>
      </div>
    </section>
  );
}
