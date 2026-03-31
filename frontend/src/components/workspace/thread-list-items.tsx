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

function SidebarThreadCard(props: {
  bridgeBadgeLabel?: string;
  bridgeLabel?: string;
  href: string;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  pendingLabel?: string;
  projectLabel?: string;
  selectionMode: boolean;
  title: string;
  updatedAtLabel?: string | null;
}) {
  const content = (
    <div
      className={`relative rounded-2xl border p-3.5 transition-colors ${
        props.isActive
          ? "border-foreground/14 bg-background shadow-[0_10px_26px_-18px_rgba(0,0,0,0.45)]"
          : "border-border/45 bg-background/82 hover:border-border/80 hover:bg-background"
      }`}
      data-thread-card="project"
    >
      {props.selectionMode ? (
        <span
          className={`absolute top-3.5 right-3.5 flex size-5 items-center justify-center rounded-full border ${
            props.isSelected
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background"
          }`}
        >
          {props.isSelected ? <Check className="size-3" /> : null}
        </span>
      ) : null}

      <div className="space-y-2">
        <div className="pr-7 text-[13px] leading-5 font-medium break-words">
          {props.title}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {props.projectLabel ? (
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
              {props.projectLabel}
            </Badge>
          ) : null}
          {props.pendingLabel ? (
            <Badge
              variant="outline"
              className="border-foreground/10 bg-accent/40 text-foreground rounded-full px-2 py-0 text-[10px]"
              data-pending-reply-label
            >
              <span className="bg-foreground/70 mr-1 inline-block size-1.5 rounded-full" />
              {props.pendingLabel}
            </Badge>
          ) : null}
          {props.bridgeLabel ? (
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
              {props.bridgeBadgeLabel} · {props.bridgeLabel}
            </Badge>
          ) : null}
        </div>

        {props.updatedAtLabel ? (
          <div className="text-muted-foreground text-[11px]">
            {props.updatedAtLabel}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (props.selectionMode) {
    return (
      <button type="button" className="block w-full text-left" onClick={props.onSelect}>
        {content}
      </button>
    );
  }

  return <Link href={props.href}>{content}</Link>;
}

function PageThreadRow(props: {
  bridgeBadgeLabel?: string;
  bridgeLabel?: string;
  href: string;
  isProject: boolean;
  isSelected: boolean;
  onSelect: () => void;
  pendingLabel?: string;
  projectLabel?: string;
  selectionMode: boolean;
  title: string;
  updatedAtLabel?: string | null;
}) {
  const content = (
    <div
      className={`border-b border-border/55 px-5 py-6 transition-colors ${
        props.selectionMode ? "flex items-start gap-3" : ""
      }`}
      data-thread-card={props.isProject ? "project" : "default"}
    >
      {props.selectionMode ? (
        <span
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
            props.isSelected
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background"
          }`}
        >
          {props.isSelected ? <Check className="size-3" /> : null}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="space-y-2">
          <div className="text-[15px] leading-6 font-medium break-words">
            {props.title}
          </div>

          {(props.projectLabel || props.bridgeLabel || props.pendingLabel) ? (
            <div className="flex flex-wrap items-center gap-2">
              {props.projectLabel ? (
                <Badge variant="outline" className="rounded-full px-2.5 py-0 text-[11px]">
                  {props.projectLabel}
                </Badge>
              ) : null}
              {props.bridgeLabel ? (
                <Badge variant="outline" className="rounded-full px-2.5 py-0 text-[11px]">
                  {props.bridgeBadgeLabel} · {props.bridgeLabel}
                </Badge>
              ) : null}
              {props.pendingLabel ? (
                <Badge
                  variant="outline"
                  className="border-foreground/10 bg-accent/40 text-foreground rounded-full px-2.5 py-0 text-[11px]"
                  data-pending-reply-label
                >
                  <span className="bg-foreground/70 mr-1 inline-block size-1.5 rounded-full" />
                  {props.pendingLabel}
                </Badge>
              ) : null}
            </div>
          ) : null}

          {props.updatedAtLabel ? (
            <div className="text-muted-foreground text-sm">
              {props.updatedAtLabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (props.selectionMode) {
    return (
      <button type="button" className="block w-full text-left" onClick={props.onSelect}>
        {content}
      </button>
    );
  }

  return <Link href={props.href}>{content}</Link>;
}

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

  const shared = {
    bridgeBadgeLabel,
    bridgeLabel,
    href,
    isSelected,
    onSelect,
    pendingLabel,
    projectLabel: projectInfo ? `项目 · ${projectInfo.project_name}` : undefined,
    selectionMode,
    title: titleOfThread(thread),
    updatedAtLabel: formatTimeAgo(thread.updated_at),
  };

  return scope === "sidebar" ? (
    <SidebarThreadCard
      {...shared}
      isActive={isActive}
    />
  ) : (
    <PageThreadRow
      {...shared}
      isProject={Boolean(projectInfo)}
    />
  );
}
