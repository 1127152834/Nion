"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import {
  pathOfMemory,
  pathOfSelfMaintenance,
} from "@/core/navigation/desktop-routes";

import { SettingsSection } from "./settings-section";

export function MemorySettingsPage() {
  const { t } = useI18n();

  return (
    <SettingsSection
      title={t.settings.memory.title}
      description={t.settings.memory.description}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border bg-background/80 p-5 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-base font-medium">
              {t.workspaceSurfaces.memory.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t.workspaceSurfaces.memory.description}
            </p>
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>{t.settings.memory.surfaces.provider.description}</p>
            <p>{t.settings.memory.surfaces.console.description}</p>
          </div>
          <Button asChild className="mt-4">
            <Link href={pathOfMemory()}>{t.workspaceSurfaces.memory.title}</Link>
          </Button>
        </article>

        <article className="rounded-xl border bg-background/80 p-5 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-base font-medium">
              {t.workspaceSurfaces.selfMaintenance.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t.workspaceSurfaces.selfMaintenance.description}
            </p>
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>{t.settings.memory.selfMaintenance.description}</p>
            <p>{t.settings.rebuild.restore}</p>
          </div>
          <Button asChild variant="outline" className="mt-4">
            <Link href={pathOfSelfMaintenance()}>
              {t.workspaceSurfaces.selfMaintenance.title}
            </Link>
          </Button>
        </article>
      </div>
    </SettingsSection>
  );
}
