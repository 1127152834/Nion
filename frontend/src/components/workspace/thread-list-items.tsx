"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { WorkspaceThreadType } from "@/core/threads/history-tabs";
import {
  pathOfProjectThread,
  pathOfThread,
  projectInfoOfThread,
  titleOfThread,
} from "@/core/threads/utils";
import { formatTimeAgo } from "@/core/utils/datetime";

type ThreadPresentationProps = {
  bridgeLabel?: string;
  bridgeBadgeLabel?: string;
  href: string;
  isActive: boolean;
  isProject: boolean;
  isSelected: boolean;
  pendingLabel?: string;
  projectLabel?: string;
  title: string;
  updatedAtLabel?: string | null;
  selectionMode: boolean;
  scope: "sidebar" | "page";
  onSelect: () => void;
};

function ThreadPresentation({
  bridgeBadgeLabel,
  bridgeLabel,
  href,
  isActive,
  isProject,
  isSelected,
  onSelect,
  pendingLabel,
  projectLabel,
  scope,
  selectionMode,
  title,
  updatedAtLabel,
}: ThreadPresentationProps) {
  const containerClassName = isProject
    ? scope === "sidebar"
      ? `rounded-2xl border px-3 py-3 transition-colors ${
          isActive
            ? "border-foreground/14 bg-background shadow-sm"
            : "border-border/55 bg-background/75 hover:border-border"
        }`
      : `rounded-3xl border px-5 py-4 transition-colors ${
          isActive
            ? "border-foreground/16 bg-background shadow-[0_18px_40px_-22px_rgba(0,0,0,0.35)]"
            : "border-border/55 bg-background/75 hover:border-border"
        }`
    : scope === "sidebar"
      ? `rounded-2xl px-3 py-2 transition-colors ${
          isActive ? "bg-accent/55 text-foreground" : "hover:bg-accent/35"
        }`
      : `border-b border-border/55 px-5 py-4 transition-colors ${
          isActive ? "bg-accent/25" : "hover:bg-accent/10"
        }`;

  const content = (
    <div
      className={
        selectionMode
          ? `flex items-start gap-3 ${containerClassName}`
          : containerClassName
      }
      data-thread-card={isProject ? "project" : "default"}
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
          className={`min-w-0 ${
            isProject ? "space-y-2.5" : "space-y-1.5"
          }`}
        >
          <div className={`truncate font-medium ${isProject ? "text-[15px]" : ""}`}>
            {title}
          </div>

          {isProject ? (
            <div className="flex flex-wrap items-center gap-2">
              {projectLabel ? (
                <Badge variant="outline" className="rounded-full px-2.5 py-0 text-[11px]">
                  {projectLabel}
                </Badge>
              ) : null}
              {pendingLabel ? (
                <Badge
                  variant="outline"
                  className="border-foreground/10 bg-accent/40 text-foreground rounded-full px-2.5 py-0 text-[11px]"
                  data-pending-reply-label
                >
                  <span className="bg-foreground/70 mr-1 inline-block size-1.5 rounded-full" />
                  {pendingLabel}
                </Badge>
              ) : null}
              {bridgeLabel ? (
                <Badge variant="outline" className="rounded-full px-2.5 py-0 text-[11px]">
                  {bridgeBadgeLabel} · {bridgeLabel}
                </Badge>
              ) : null}
            </div>
          ) : (
            <>
              {projectLabel ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                    {projectLabel}
                  </Badge>
                </div>
              ) : null}
              {bridgeLabel ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                    {bridgeBadgeLabel} · {bridgeLabel}
                  </Badge>
                </div>
              ) : null}
              {pendingLabel ? (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-foreground/10 bg-accent/40 text-foreground rounded-full px-2 py-0 text-[10px]"
                    data-pending-reply-label
                  >
                    <span className="bg-foreground/70 mr-1 inline-block size-1.5 rounded-full" />
                    {pendingLabel}
                  </Badge>
                </div>
              ) : null}
            </>
          )}

          {updatedAtLabel ? (
            <div
              className={`text-muted-foreground ${
                isProject ? "text-xs" : "text-sm"
              }`}
            >
              {updatedAtLabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (selectionMode) {
    return (
      <button type="button" className="w-full text-left" onClick={onSelect}>
        {content}
      </button>
    );
  }

  return <Link href={href}>{content}</Link>;
}

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

export function WorkspaceThreadListItem({
  bridgeBadgeLabel,
  bridgeLabel,
  currentType,
  isActive,
  isSelected,
  onSelect,
  pendingLabel,
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
    <ThreadPresentation
      bridgeBadgeLabel={bridgeBadgeLabel}
      bridgeLabel={bridgeLabel}
      href={href}
      isActive={isActive}
      isProject={Boolean(projectInfo)}
      isSelected={isSelected}
      onSelect={onSelect}
      pendingLabel={pendingLabel}
      projectLabel={projectInfo ? `项目 · ${projectInfo.project_name}` : undefined}
      scope={scope}
      selectionMode={selectionMode}
      title={titleOfThread(thread)}
      updatedAtLabel={formatTimeAgo(thread.updated_at)}
    />
  );
}
