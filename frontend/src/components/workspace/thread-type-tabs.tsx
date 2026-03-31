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
            : "w-full justify-start rounded-full border border-border/45 bg-background/55 p-1"
        }
      >
        <TabsTrigger value="general">
          {t.sidebar.chats}
        </TabsTrigger>
        <TabsTrigger value="project">
          {t.sidebar.projects}
        </TabsTrigger>
        <TabsTrigger value="bridge">
          {t.bridge.menuLabel}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
