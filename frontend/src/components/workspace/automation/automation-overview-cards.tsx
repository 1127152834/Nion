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
import type { AutomationRun, AutomationStatus } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type AutomationOverviewCardsProps = {
  runs: AutomationRun[];
  status: AutomationStatus;
};

export function AutomationOverviewCards({
  runs,
  status,
}: AutomationOverviewCardsProps) {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.overview;
  const summary = summarizeOverview({ status, runs });

  const cards = [
    {
      id: "scheduler",
      label: copy.scheduler,
      value: status.scheduler_running ? copy.schedulerRunning : copy.schedulerIdle,
      icon: PlayCircleIcon,
    },
    {
      id: "active",
      label: copy.active,
      value: summary.cards[0]?.value ?? "0",
      icon: ActivityIcon,
    },
    {
      id: "runs",
      label: copy.runs,
      value: summary.cards[1]?.value ?? "0",
      icon: CheckCircle2Icon,
    },
    {
      id: "attention",
      label: copy.attention,
      value: summary.cards[2]?.value ?? "0",
      icon: AlertTriangleIcon,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.id} className="gap-3 py-0">
          <CardHeader className="px-5 pt-5 pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <card.icon className="size-4" />
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-semibold tracking-tight">
              {card.value}
            </div>
            {card.id === "scheduler" ? (
              <div className="text-muted-foreground mt-2 text-xs">
                {copy.lastSuccess}: {summary.lastSuccessAt ?? copy.notRecordedYet}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
