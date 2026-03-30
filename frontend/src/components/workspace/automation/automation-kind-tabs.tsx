"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/core/i18n/hooks";

export function AutomationKindTabs() {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.tabs;

  return (
    <TabsList variant="line" className="w-full justify-start border-b px-0">
      <TabsTrigger value="overview">{copy.overview}</TabsTrigger>
      <TabsTrigger value="reminders">{copy.reminders}</TabsTrigger>
      <TabsTrigger value="tasks">{copy.tasks}</TabsTrigger>
      <TabsTrigger value="events">{copy.events}</TabsTrigger>
      <TabsTrigger value="eventCenter">{copy.eventCenter}</TabsTrigger>
      <TabsTrigger value="history">{copy.history}</TabsTrigger>
    </TabsList>
  );
}
