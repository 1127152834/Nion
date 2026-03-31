"use client";

import {
  Check,
  Download,
  FileJson,
  FileText,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getAPIClient } from "@/core/api";
import { useI18n } from "@/core/i18n/hooks";
import { derivePendingClarification } from "@/core/threads";
import {
  exportThreadAsJSON,
  exportThreadAsMarkdown,
} from "@/core/threads/export";
import {
  useDeleteThread,
  useDeleteThreads,
  useRenameThread,
  useThreads,
} from "@/core/threads/hooks";
import type { AgentThread, AgentThreadState } from "@/core/threads/types";
import {
  bridgeInfoOfThread,
  pathOfProjectThread,
  pathOfThread,
  projectInfoOfThread,
  titleOfThread,
} from "@/core/threads/utils";
import { env } from "@/env";

import { useBridgeTranslation } from "./bridge/useBridgeTranslation";

export function RecentChatList() {
  const { t } = useI18n();
  const { t: bt } = useBridgeTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const threadIdFromPath = searchParams.get("thread");
  const { data: threads = [] } = useThreads();
  const { mutate: deleteThread } = useDeleteThread();
  const { mutate: deleteThreads } = useDeleteThreads();
  const { mutate: renameThread } = useRenameThread();
  const threadGroups = useMemo(() => {
    const enriched = threads.map((thread) => ({
      thread,
      pendingClarification: derivePendingClarification(
        thread.values?.messages ?? [],
      ),
      project: projectInfoOfThread(thread),
      bridge: bridgeInfoOfThread(thread),
    }));

    const pending = enriched.filter((entry) => entry.pendingClarification);
    const regular = enriched.filter((entry) => !entry.pendingClarification);
    const ordered = [...pending, ...regular].sort((a, b) => {
      const aProject = Boolean(a.project);
      const bProject = Boolean(b.project);
      if (aProject !== bProject) {
        return aProject ? -1 : 1;
      }
      return 0;
    });
    return {
      project: ordered.filter((entry) => entry.project),
      bridge: ordered.filter((entry) => !entry.project && entry.bridge),
      general: ordered.filter((entry) => !entry.project && !entry.bridge),
    };
  }, [threads]);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameThreadId, setRenameThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);

  const handleDelete = useCallback(
    (threadId: string) => {
      deleteThread({ threadId });
      if (threadId === threadIdFromPath) {
        const threadIndex = threads.findIndex((thread) => thread.thread_id === threadId);
        let nextThreadId = "new";
        if (threadIndex > -1) {
          if (threads[threadIndex + 1]) {
            nextThreadId = threads[threadIndex + 1]!.thread_id;
          } else if (threads[threadIndex - 1]) {
            nextThreadId = threads[threadIndex - 1]!.thread_id;
          }
        }
        void router.push(pathOfThread(nextThreadId));
      }
    },
    [deleteThread, router, threadIdFromPath, threads],
  );

  const resolveNextThreadId = useCallback(
    (deletedIds: string[]) => {
      if (!threadIdFromPath || !deletedIds.includes(threadIdFromPath)) {
        return null;
      }

      const remainingThreads = threads.filter(
        (thread) => !deletedIds.includes(thread.thread_id),
      );
      return remainingThreads[0]?.thread_id ?? "new";
    },
    [threadIdFromPath, threads],
  );

  const toggleThreadSelection = useCallback((threadId: string) => {
    setSelectedThreadIds((current) =>
      current.includes(threadId)
        ? current.filter((id) => id !== threadId)
        : [...current, threadId],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    const ids = groups.flatMap((group) =>
      group.items.map(({ thread }) => thread.thread_id),
    );
    setSelectedThreadIds((current) =>
      current.length === ids.length ? [] : ids,
    );
  }, [groups]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedThreadIds.length === 0) {
      return;
    }
    const deletedIds = [...selectedThreadIds];
    const nextThreadId = resolveNextThreadId(deletedIds);
    deleteThreads({ threadIds: deletedIds });
    setSelectedThreadIds([]);
    setSelectionMode(false);
    if (nextThreadId) {
      void router.push(pathOfThread(nextThreadId));
    }
  }, [deleteThreads, resolveNextThreadId, router, selectedThreadIds]);

  const handleRenameClick = useCallback(
    (threadId: string, currentTitle: string) => {
      setRenameThreadId(threadId);
      setRenameValue(currentTitle);
      setRenameDialogOpen(true);
    },
    [],
  );

  const handleRenameSubmit = useCallback(() => {
    if (renameThreadId && renameValue.trim()) {
      renameThread({ threadId: renameThreadId, title: renameValue.trim() });
      setRenameDialogOpen(false);
      setRenameThreadId(null);
      setRenameValue("");
    }
  }, [renameThread, renameThreadId, renameValue]);

  const handleShare = useCallback(
    async (threadId: string) => {
      const VERCEL_URL = "https://nion-v2.vercel.app";
      const isLocalhost =
        window.location.hostname === "localhost"
        || window.location.hostname === "127.0.0.1";
      const baseUrl = isLocalhost ? VERCEL_URL : window.location.origin;
      const shareUrl = `${baseUrl}${pathOfThread(threadId)}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t.clipboard.linkCopied);
      } catch {
        toast.error(t.clipboard.failedToCopyToClipboard);
      }
    },
    [t],
  );

  const handleExport = useCallback(
    async (thread: AgentThread, format: "markdown" | "json") => {
      try {
        const apiClient = getAPIClient();
        const state = await apiClient.getState<AgentThreadState>(
          thread.thread_id,
        );
        const messages = state.values?.messages ?? [];
        if (messages.length === 0) {
          toast.error(t.conversation.noMessages);
          return;
        }
        if (format === "markdown") {
          exportThreadAsMarkdown(thread, messages);
        } else {
          exportThreadAsJSON(thread, messages);
        }
        toast.success(t.common.exportSuccess);
      } catch {
        toast.error("Failed to export conversation");
      }
    },
    [t],
  );

  if (
    threadGroups.project.length === 0 &&
    threadGroups.bridge.length === 0 &&
    threadGroups.general.length === 0
  ) {
    return null;
  }

  const groups = [
    {
      key: "project",
      label: "项目对话",
      items: threadGroups.project,
    },
    {
      key: "bridge",
      label: "桥接对话",
      items: threadGroups.bridge,
    },
    {
      key: "general",
      label:
        env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY !== "true"
          ? t.sidebar.recentChats
          : t.sidebar.demoChats,
      items: threadGroups.general,
    },
  ].filter((group) => group.items.length > 0);

  return (
    <>
      <SidebarGroup>
        <div className="flex items-center justify-between px-2">
          <SidebarGroupLabel>
            {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY !== "true"
              ? t.sidebar.recentChats
              : t.sidebar.demoChats}
          </SidebarGroupLabel>
          {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY !== "true" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-full px-2 text-xs text-muted-foreground"
              onClick={() => {
                setSelectionMode((value) => !value);
                setSelectedThreadIds([]);
              }}
            >
              {selectionMode ? t.common.cancel : t.common.select}
            </Button>
          ) : null}
        </div>
        <SidebarGroupContent className="group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
          {selectionMode ? (
            <div className="mb-2 flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              <span>
                {t.chats.selectedCount.replace(
                  "{count}",
                  String(selectedThreadIds.length),
                )}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-2 text-xs"
                  onClick={handleSelectAll}
                >
                  {t.common.selectAll}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-2 text-xs"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedThreadIds([]);
                  }}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-2 text-xs text-destructive"
                  disabled={selectedThreadIds.length === 0}
                  onClick={handleDeleteSelected}
                >
                  {t.common.delete}
                </Button>
              </div>
            </div>
          ) : null}
        </SidebarGroupContent>
      </SidebarGroup>

      {groups.map((group) => (
        <SidebarGroup key={group.key}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent className="group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
            <SidebarMenu>
              <div className="flex w-full flex-col gap-1">
                {group.items.map(({ thread, pendingClarification }) => {
                  const isActive =
                    (pathname === "/workspace/chats" &&
                      searchParams.get("thread") === thread.thread_id) ||
                    pathname.endsWith(`/threads/${thread.thread_id}`);
                  const bridgeInfo = bridgeInfoOfThread(thread);
                  const projectInfo = projectInfoOfThread(thread);
                  const isSelected = selectedThreadIds.includes(thread.thread_id);
                  const bridgeLabel = bridgeInfo
                    ? bridgeInfo.platform === "telegram"
                      ? bt("bridge.telegramChannel")
                      : bridgeInfo.platform === "feishu"
                        ? bt("bridge.feishuChannel")
                        : bridgeInfo.platform === "discord"
                          ? bt("bridge.discordChannel")
                          : bridgeInfo.platform === "qq"
                            ? bt("bridge.qqChannel")
                            : bridgeInfo.platform === "weixin"
                              ? bt("bridge.weixinChannel")
                              : bridgeInfo.platform
                    : "";

                  return (
                    <SidebarMenuItem
                      key={thread.thread_id}
                      className="group/side-menu-item"
                    >
                      <SidebarMenuButton isActive={isActive} asChild>
                        <div>
                          {selectionMode ? (
                            <button
                              type="button"
                              className="text-muted-foreground flex w-full items-center gap-2 overflow-hidden rounded-2xl px-2 py-1.5 text-left"
                              onClick={() => toggleThreadSelection(thread.thread_id)}
                            >
                              <span
                                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                                  isSelected
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-border bg-background"
                                }`}
                              >
                                {isSelected ? <Check className="size-3" /> : null}
                              </span>
                              <span className="flex min-w-0 flex-col gap-1 overflow-hidden">
                                <span className="truncate">{titleOfThread(thread)}</span>
                                {projectInfo ? (
                                  <span className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="gap-1 rounded-full px-2 py-0 text-[10px]"
                                    >
                                      项目 · {projectInfo.project_name}
                                    </Badge>
                                  </span>
                                ) : null}
                                {bridgeInfo ? (
                                  <span className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="gap-1 rounded-full px-2 py-0 text-[10px]"
                                    >
                                      {bt("bridge.bridgeChatBadge")} · {bridgeLabel}
                                    </Badge>
                                  </span>
                                ) : null}
                                {pendingClarification ? (
                                  <span className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="border-foreground/10 bg-accent/40 text-foreground gap-1 rounded-full px-2 py-0 text-[10px]"
                                      data-pending-reply-label
                                    >
                                      <span className="bg-foreground/70 size-1.5 rounded-full" />
                                      {t.sidebar.pendingReply}
                                    </Badge>
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          ) : (
                            <Link
                              className="text-muted-foreground block w-full overflow-hidden group-hover/side-menu-item:overflow-hidden"
                              href={
                                projectInfo
                                  ? pathOfProjectThread(
                                      projectInfo.project_id,
                                      thread.thread_id,
                                    )
                                  : pathOfThread(thread.thread_id)
                              }
                            >
                              <span className="flex min-w-0 flex-col gap-1 overflow-hidden">
                                <span className="truncate">{titleOfThread(thread)}</span>
                                {projectInfo ? (
                                  <span className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="gap-1 rounded-full px-2 py-0 text-[10px]"
                                    >
                                      项目 · {projectInfo.project_name}
                                    </Badge>
                                  </span>
                                ) : null}
                                {bridgeInfo ? (
                                  <span className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="gap-1 rounded-full px-2 py-0 text-[10px]"
                                    >
                                      {bt("bridge.bridgeChatBadge")} · {bridgeLabel}
                                    </Badge>
                                  </span>
                                ) : null}
                                {pendingClarification ? (
                                  <span className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="border-foreground/10 bg-accent/40 text-foreground gap-1 rounded-full px-2 py-0 text-[10px]"
                                      data-pending-reply-label
                                    >
                                      <span className="bg-foreground/70 size-1.5 rounded-full" />
                                      {t.sidebar.pendingReply}
                                    </Badge>
                                  </span>
                                ) : null}
                              </span>
                            </Link>
                          )}
                          {!selectionMode &&
                          env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY !== "true" ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuAction
                                  showOnHover
                                  className="bg-background/50 hover:bg-background"
                                >
                                  <MoreHorizontal />
                                  <span className="sr-only">{t.common.more}</span>
                                </SidebarMenuAction>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                className="w-48 rounded-lg"
                                side="right"
                                align="start"
                              >
                                <DropdownMenuItem
                                  onSelect={() =>
                                    handleRenameClick(
                                      thread.thread_id,
                                      titleOfThread(thread),
                                    )
                                  }
                                >
                                  <Pencil className="text-muted-foreground" />
                                  <span>{t.common.rename}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleShare(thread.thread_id)}
                                >
                                  <Share2 className="text-muted-foreground" />
                                  <span>{t.common.share}</span>
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Download className="text-muted-foreground" />
                                    <span>{t.common.export}</span>
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onSelect={() =>
                                        handleExport(thread, "markdown")
                                      }
                                    >
                                      <FileText className="text-muted-foreground" />
                                      <span>{t.common.exportAsMarkdown}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() =>
                                        handleExport(thread, "json")
                                      }
                                    >
                                      <FileJson className="text-muted-foreground" />
                                      <span>{t.common.exportAsJSON}</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={() => handleDelete(thread.thread_id)}
                                >
                                  <Trash2 className="text-muted-foreground" />
                                  <span>{t.common.delete}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.common.rename}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleRenameSubmit}>{t.common.rename}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
