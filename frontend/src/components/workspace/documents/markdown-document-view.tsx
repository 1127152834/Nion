"use client";

export function MarkdownDocumentView(props: {
  title: string;
  documentName: string;
  document: string;
}) {
  return (
    <section className="rounded-2xl border bg-background p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.16em]">
            {props.documentName}
          </div>
          <div className="mt-1 text-base font-semibold">{props.title}</div>
        </div>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-7">
        {props.document}
      </pre>
    </section>
  );
}
