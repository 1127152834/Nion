export function SelfMaintenancePage() {
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Self-Maintenance
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Self-Maintenance
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Monitor Heartbeat health and keep proposal-driven maintenance work in
          a dedicated workspace surface.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Heartbeat</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Watch agent heartbeat status, maintenance cadence, and recent
            self-check signals.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Memory Update Proposals</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Review memory update proposals, prune proposals, and other
            proposal-backed maintenance actions.
          </p>
        </article>
      </section>
    </div>
  );
}
