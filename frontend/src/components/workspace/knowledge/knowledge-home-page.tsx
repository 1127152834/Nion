"use client";

export function KnowledgeHomePage() {
  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <section className="rounded-lg border bg-background p-5">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Knowledge Base</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Overview for the compiled knowledge surface.
        </p>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <h2 className="text-[1.1rem] font-semibold tracking-tight">Queue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Queue summary for notebook-derived source candidates.
        </p>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <h2 className="text-[1.1rem] font-semibold tracking-tight">Graph</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Graph status and latest rebuild information.
        </p>
      </section>
    </main>
  );
}
