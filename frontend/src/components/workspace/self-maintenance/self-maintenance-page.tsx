import { useI18n } from "@/core/i18n/hooks";

export function SelfMaintenancePage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t.workspaceSurfaces.selfMaintenance.eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.workspaceSurfaces.selfMaintenance.title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t.workspaceSurfaces.selfMaintenance.description}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">
            {t.workspaceSurfaces.selfMaintenance.heartbeatTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.workspaceSurfaces.selfMaintenance.heartbeatDescription}
          </p>
        </article>
        <article className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">
            {t.workspaceSurfaces.selfMaintenance.proposalsTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.workspaceSurfaces.selfMaintenance.proposalsDescription}
          </p>
        </article>
      </section>
    </div>
  );
}
