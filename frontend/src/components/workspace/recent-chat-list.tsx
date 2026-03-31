"use client";

import {
  Download,
  FileJson,
  FileText,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { useLocalSettings } from "@/core/settings";
import {
  derivePendingClarification,
  filterThreadsByWorkspaceType,
  groupThreadsByWorkspaceType,
  parseWorkspaceThreadType,
} from "@/core/threads";
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
  pathOfThread,
  titleOfThread,
} from "@/core/threads/utils";
import { env } from "@/env";

import { useBridgeTranslation } from "./bridge/useBridgeTranslation";
import { WorkspaceThreadListItem } from "./thread-list-items";
import { ThreadTypeTabs } from "./thread-type-tabs";

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
  const [settings, setSettings] = useLocalSettings();
  const activeType = pathname.startsWith("/workspace/projects/")
    ? "project"
    : parseWorkspaceThreadType(settings.layout.recent_chat_tab);

  const threadGroups = useMemo(
    () =>
      groupThreadsByWorkspaceType(
        threads.map((thread) => ({
          thread,
          pendingClarification: Boolean(
            derivePendingClarification(thread.values?.messages ?? []),
          ),
        })),
      ),
    [threads],
  );
  const activeGroup = filterThreadsByWorkspaceType(threadGroups, activeType);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameThreadId, setRenameThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);

  const handleDelete = useCallback(
    (threadId: string) => {
      deleteThread({ threadId });
      if (threadId === threadIdFromPath) {
        const threadIndex = activeGroup.findIndex(
          ({ thread }) => thread.thread_id === threadId,
        );
        let nextThreadId = "new";
        if (threadIndex > -1) {
          if (activeGroup[threadIndex + 1]) {
            nextThreadId = activeGroup[threadIndex + 1]!.thread.thread_id;
          } else if (activeGroup[threadIndex - 1]) {
            nextThreadId = activeGroup[threadIndex - 1]!.thread.thread_id;
          }
        }
        void router.push(pathOfThread(nextThreadId, { type: activeType }));
      }
    },
    [activeGroup, activeType, deleteThread, router, threadIdFromPath],
  );

  const resolveNextThreadId = useCallback(
    (deletedIds: string[]) => {
      if (!threadIdFromPath || !deletedIds.includes(threadIdFromPath)) {
        return null;
      }

      const remainingThreads = activeGroup.filter(
        ({ thread }) => !deletedIds.includes(thread.thread_id),
      );
      return remainingThreads[0]?.thread.thread_id ?? "new";
    },
    [activeGroup, threadIdFromPath],
  );

  const toggleThreadSelection = useCallback((threadId: string) => {
    setSelectedThreadIds((current) =>
      current.includes(threadId)
        ? current.filter((id) => id !== threadId)
        : [...current, threadId],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    const ids = activeGroup.map(({ thread }) => thread.thread_id);
    setSelectedThreadIds((current) =>
      current.length === ids.length ? [] : ids,
    );
  }, [activeGroup]);

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
      void router.push(pathOfThread(nextThreadId, { type: activeType }));
    }
  }, [activeType, deleteThreads, resolveNextThreadId, router, selectedThreadIds]);

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
      const shareUrl = `${baseUrl}${pathOfThread(threadId, { type: activeType })}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t.clipboard.linkCopied);
      } catch {
        toast.error(t.clipboard.failedToCopyToClipboard);
      }
    },
    [activeType, t],
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
          <ThreadTypeTabs
            scope="sidebar"
            value={activeType}
            onValueChange={(nextType) => {
              setSelectedThreadIds([]);
              setSettings("layout", { recent_chat_tab: nextType });
            }}
            className="mb-3 px-2"
          />
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

      <SidebarGroup>
        <SidebarGroupContent className="group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
          <SidebarMenu>
            <div className="flex w-full flex-col gap-2 px-2 pb-2">
              {activeGroup.map(({ thread, pendingClarification }) => {
                const isActive =
                  (pathname === "/workspace/chats" &&
                    searchParams.get("thread") === thread.thread_id) ||
                  pathname.endsWith(`/threads/${thread.thread_id}`);
                const bridgeInfo = bridgeInfoOfThread(thread);
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
                    <SidebarMenuButton isActive={false} asChild className="h-auto overflow-visible bg-transparent p-0 hover:bg-transparent">
                      <div className="relative">
                        <WorkspaceThreadListItem
                          bridgeBadgeLabel={bt("bridge.bridgeChatBadge")}
                          bridgeLabel={bridgeLabel}
                          currentType={activeType}
                          isActive={isActive}
                          isSelected={selectedThreadIds.includes(thread.thread_id)}
                          pendingLabel={pendingClarification ? t.sidebar.pendingReply : undefined}
                          scope="sidebar"
                          selectionMode={selectionMode}
                          thread={thread}
                          onSelect={() => toggleThreadSelection(thread.thread_id)}
                        />
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
