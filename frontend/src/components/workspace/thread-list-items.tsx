"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import type { WorkspaceThreadType } from "@/core/threads/history-tabs";
import {
  pathOfProjectThread,
  pathOfThread,
  projectInfoOfThread,
  titleOfThread,
} from "@/core/threads/utils";
import { formatTimeAgo } from "@/core/utils/datetime";

type WorkspaceThreadListItemProps = {
  thread: Parameters<typeof titleOfThread>[0];
  bridgeLabel?: string;
  bridgeBadgeLabel?: string;
  currentType: WorkspaceThreadType;
  isActive: boolean;
  isSelected: boolean;
  pendingLabel?: string;
  scope: "sidebar" | "page";
  selectionMode: boolean;
  onSelect: () => void;
};

type ThreadListRowProps = {
  href: string;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  scope: "sidebar" | "page";
  selectionMode: boolean;
  title: string;
  updatedAtLabel?: string | null;
};

function ThreadListRow({
  href,
  isActive,
  isSelected,
  onSelect,
  scope,
  selectionMode,
  title,
  updatedAtLabel,
}: ThreadListRowProps) {
  const content = (
    <div
      className={`min-w-0 ${
        scope === "sidebar"
          ? `relative rounded-lg px-3 py-2.5 transition-colors after:absolute after:right-4 after:bottom-0 after:left-4 after:h-px after:bg-foreground/12 after:content-[''] last:after:hidden ${
              isActive ? "bg-accent/35" : "hover:bg-accent/18"
            }`
          : "border-b border-border/55 px-5 py-6"
      } ${selectionMode ? "flex items-start gap-3" : ""}`}
      data-thread-card="default"
    >
      {selectionMode ? (
        <span
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
            isSelected
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background"
          }`}
        >
          {isSelected ? <Check className="size-3" /> : null}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <div
          className={`truncate font-medium ${
            scope === "sidebar" ? "text-[13px] leading-5" : "text-[15px] leading-6"
          }`}
        >
          {title}
        </div>
        {updatedAtLabel ? (
          <div
            className={`text-muted-foreground mt-1 ${
              scope === "sidebar" ? "text-[11px]" : "text-sm"
            }`}
          >
            {updatedAtLabel}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (selectionMode) {
    return (
      <button type="button" className="block w-full text-left" onClick={onSelect}>
        {content}
      </button>
    );
  }

  return <Link href={href}>{content}</Link>;
}

export function WorkspaceThreadListItem({
  currentType,
  isActive,
  isSelected,
  onSelect,
  scope,
  selectionMode,
  thread,
}: WorkspaceThreadListItemProps) {
  const projectInfo = projectInfoOfThread(thread);
  const href = projectInfo
    ? pathOfProjectThread(projectInfo.project_id, thread.thread_id, {
        type: "project",
      })
    : pathOfThread(thread.thread_id, { type: currentType });

  return (
    <ThreadListRow
      href={href}
      isActive={isActive}
      isSelected={isSelected}
      onSelect={onSelect}
      scope={scope}
      selectionMode={selectionMode}
      title={titleOfThread(thread)}
      updatedAtLabel={formatTimeAgo(thread.updated_at)}
    />
  );
}
