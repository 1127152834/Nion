"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/core/i18n/hooks";
import type { WorkspaceThreadType } from "@/core/threads/history-tabs";
import { cn } from "@/lib/utils";

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
  const items: Array<{ value: WorkspaceThreadType; label: string }> = [
    { value: "general", label: t.sidebar.chats },
    { value: "project", label: t.sidebar.projects },
    { value: "bridge", label: t.bridge.menuLabel },
  ];
  const activeIndex = items.findIndex((item) => item.value === value);

  if (scope === "sidebar") {
    return (
      <Tabs
        value={value}
        onValueChange={(next) => onValueChange(next as WorkspaceThreadType)}
        className={className}
        data-thread-type-tabs={scope}
      >
        <TabsList
          variant="line"
          className="relative grid h-10 w-full grid-cols-3 items-end border-b border-border/35 px-0"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-1/3 rounded-full bg-foreground/90 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
          />
          {items.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className={cn(
                "h-10 rounded-none border-0 px-0 pb-2 text-[12px] font-medium text-foreground/42 transition-[color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] after:hidden hover:text-foreground/72 data-[state=active]:translate-y-0 data-[state=active]:text-foreground",
              )}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    );
  }

  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as WorkspaceThreadType)}
      className={className}
      data-thread-type-tabs={scope}
    >
      <TabsList variant="line" className="w-full justify-start border-b px-0">
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
