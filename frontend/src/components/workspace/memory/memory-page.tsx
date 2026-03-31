export function MemoryPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Memory
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Memory Provider
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Focus memory operations in one place, from recall workflows to memory
          search and console diagnostics.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Memory Console</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Inspect memory writes, validate provider status, and review recall
            traces without mixing in unrelated workspace surfaces.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Recall</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Run Memory Search flows and tune retrieval behavior for ongoing
            memory operations.
          </p>
        </article>
      </section>
    </div>
  );
}
