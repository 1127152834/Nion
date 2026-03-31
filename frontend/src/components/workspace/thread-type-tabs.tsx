"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/core/i18n/hooks";
import type { WorkspaceThreadType } from "@/core/threads/history-tabs";

type ThreadTypeTabsProps = {
  scope: "sidebar" | "page";
  value: WorkspaceThreadType;
  onValueChange: (value: WorkspaceThreadType) => void;
  className?: string;
};

export function ThreadTypeTabs({
  scope,
  value,
  onValueChange,
  className,
}: ThreadTypeTabsProps) {
  const { t } = useI18n();

  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as WorkspaceThreadType)}
      className={className}
      data-thread-type-tabs={scope}
    >
      <TabsList
        variant="line"
        className={
          scope === "page"
            ? "w-full justify-start border-b px-0"
            : "grid w-full grid-cols-3 rounded-xl border border-border/40 bg-background/70 p-0.5"
        }
      >
        <TabsTrigger
          value="general"
          className={
            scope === "sidebar"
              ? "h-8 rounded-lg px-0 text-[12px] font-medium data-[state=active]:bg-background data-[state=active]:shadow-none after:hidden"
              : undefined
          }
        >
          {t.sidebar.chats}
        </TabsTrigger>
        <TabsTrigger
          value="project"
          className={
            scope === "sidebar"
              ? "h-8 rounded-lg px-0 text-[12px] font-medium data-[state=active]:bg-background data-[state=active]:shadow-none after:hidden"
              : undefined
          }
        >
          {t.sidebar.projects}
        </TabsTrigger>
        <TabsTrigger
          value="bridge"
          className={
            scope === "sidebar"
              ? "h-8 rounded-lg px-0 text-[12px] font-medium data-[state=active]:bg-background data-[state=active]:shadow-none after:hidden"
              : undefined
          }
        >
          {t.bridge.menuLabel}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
