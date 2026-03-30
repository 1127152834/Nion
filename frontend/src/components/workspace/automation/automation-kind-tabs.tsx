"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/core/i18n/hooks";

export function AutomationKindTabs() {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.tabs;

  return (
    <TabsList
      variant="line"
      className="w-full justify-start gap-1.5 rounded-full border border-stone-200/80 bg-[linear-gradient(180deg,rgba(250,246,238,0.92),rgba(243,236,224,0.9))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_24px_rgba(98,74,37,0.06)]"
    >
      <TabsTrigger
        value="overview"
        className="rounded-full px-4 py-2.5 data-[state=active]:border-stone-300/80 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-[0_8px_18px_rgba(98,74,37,0.08)]"
      >
        {copy.overview}
      </TabsTrigger>
      <TabsTrigger
        value="reminders"
        className="rounded-full px-4 py-2.5 data-[state=active]:border-stone-300/80 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-[0_8px_18px_rgba(98,74,37,0.08)]"
      >
        {copy.reminders}
      </TabsTrigger>
      <TabsTrigger
        value="tasks"
        className="rounded-full px-4 py-2.5 data-[state=active]:border-stone-300/80 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-[0_8px_18px_rgba(98,74,37,0.08)]"
      >
        {copy.tasks}
      </TabsTrigger>
      <TabsTrigger
        value="events"
        className="rounded-full px-4 py-2.5 data-[state=active]:border-stone-300/80 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-[0_8px_18px_rgba(98,74,37,0.08)]"
      >
        {copy.events}
      </TabsTrigger>
      <TabsTrigger
        value="eventCenter"
        className="rounded-full px-4 py-2.5 data-[state=active]:border-stone-300/80 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-[0_8px_18px_rgba(98,74,37,0.08)]"
      >
        {copy.eventCenter}
      </TabsTrigger>
      <TabsTrigger
        value="history"
        className="rounded-full px-4 py-2.5 data-[state=active]:border-stone-300/80 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-[0_8px_18px_rgba(98,74,37,0.08)]"
      >
        {copy.history}
      </TabsTrigger>
    </TabsList>
  );
}
