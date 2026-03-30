"use client";

import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  PlayCircleIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { summarizeOverview } from "@/core/automation/presentation";
import type { AutomationJob, AutomationRun, AutomationStatus } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type AutomationOverviewCardsProps = {
  jobs?: AutomationJob[];
  runs: AutomationRun[];
  status: AutomationStatus;
};

export function AutomationOverviewCards({
  jobs = [],
  runs,
  status,
}: AutomationOverviewCardsProps) {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.overview;
  const summary = summarizeOverview({ status, runs, jobs });

  const cards = [
    {
      id: "scheduler",
      label: copy.scheduler,
      value: status.scheduler_running ? copy.schedulerRunning : copy.schedulerIdle,
      icon: PlayCircleIcon,
      accentClass: "from-stone-100 via-white to-stone-50",
      iconClass: "text-stone-700",
    },
    {
      id: "active",
      label: copy.active,
      value: summary.cards[0]?.value ?? "0",
      icon: ActivityIcon,
      accentClass: "from-amber-50 via-white to-stone-50",
      iconClass: "text-amber-700",
    },
    {
      id: "runs",
      label: copy.runs,
      value: summary.cards[1]?.value ?? "0",
      icon: CheckCircle2Icon,
      accentClass: "from-emerald-50 via-white to-stone-50",
      iconClass: "text-emerald-700",
    },
    {
      id: "attention",
      label: copy.attention,
      value: summary.cards[2]?.value ?? "0",
      icon: AlertTriangleIcon,
      accentClass: "from-rose-50 via-white to-stone-50",
      iconClass: "text-rose-700",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.id}
          className="gap-3 overflow-hidden rounded-[26px] border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,252,245,0.95),rgba(248,243,233,0.92))] py-0 shadow-[0_18px_48px_rgba(98,74,37,0.08)]"
        >
          <div className={`h-1 w-full bg-[linear-gradient(90deg,var(--tw-gradient-stops))] ${card.accentClass}`} />
          <CardHeader className="px-5 pt-5 pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-stone-500">
              <span className={`flex size-8 items-center justify-center rounded-full border border-stone-200 bg-white/90 shadow-xs ${card.iconClass}`}>
                <card.icon className="size-4" />
              </span>
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-semibold tracking-tight text-stone-900">
              {card.value}
            </div>
            {card.id === "scheduler" ? (
              <div className="mt-3 text-xs text-stone-500">
                {copy.lastSuccess}: {summary.lastSuccessAt ?? copy.notRecordedYet}
              </div>
            ) : null}
            {card.id === "active" && summary.nextJob ? (
              <div className="mt-3 rounded-2xl border border-stone-200/80 bg-white/70 px-3 py-2 text-xs text-stone-600">
                {copy.nextRun}: {summary.nextJob.name} · {summary.nextJob.nextRunAt}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
