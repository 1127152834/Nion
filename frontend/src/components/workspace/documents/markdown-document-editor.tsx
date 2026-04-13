"use client";

import { Textarea } from "@/components/ui/textarea";

export function MarkdownDocumentEditor(props: {
  title: string;
  documentName: string;
  draft: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isSaving?: boolean;
}) {
  return (
    <section className="rounded-2xl border bg-background p-6">
      <div className="mb-4">
        <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.16em]">
          {props.documentName}
        </div>
        <div className="mt-1 text-base font-semibold">{props.title}</div>
      </div>
      <Textarea
        className="min-h-80"
        value={props.draft}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <button
        type="button"
        className="mt-4 rounded-full border px-4 py-2 text-sm"
        onClick={props.onSave}
      >
        {props.isSaving ? "保存中" : "保存并生效"}
      </button>
    </section>
  );
}
