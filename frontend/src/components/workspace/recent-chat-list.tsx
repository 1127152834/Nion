"use client";

import {
  ChevronDownIcon,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";

import {
  bridgePlatformLabel,
  useBridgeTranslation,
} from "./bridge/useBridgeTranslation";
import { WorkspaceThreadListItem } from "./thread-list-items";
import { ThreadTypeTabs } from "./thread-type-tabs";

type ThreadGroupSection = {
  id: string;
  label: string;
  entries: Array<{
    thread: AgentThread;
    pendingClarification: boolean;
  }>;
};

function groupEntriesBySource(
  entries: Array<{
    thread: AgentThread;
    pendingClarification: boolean;
  }>,
  bt: ReturnType<typeof useBridgeTranslation>["t"],
): ThreadGroupSection[] {
  const sections = new Map<string, ThreadGroupSection>();

  for (const entry of entries) {
    const bridge = bridgeInfoOfThread(entry.thread);
    const bridgeLabel = bridge?.label?.trim();
    const normalizedBridgeLabel =
      bridgeLabel && bridgeLabel.length > 0 ? bridgeLabel : undefined;
    const groupLabel = normalizedBridgeLabel ?? bridgePlatformLabel(
      bridge?.platform ?? "bridge",
      bt,
    );
    const groupId = `${bridge?.platform ?? "bridge"}:${groupLabel}`;
    const existing = sections.get(groupId);
    if (existing) {
      existing.entries.push(entry);
    } else {
      sections.set(groupId, {
        id: groupId,
        label: groupLabel,
        entries: [entry],
      });
    }
  }

  return Array.from(sections.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "zh-CN"),
  );
}

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
  const activeType = parseWorkspaceThreadType(settings.layout.recent_chat_tab);

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
  const groupedSections = useMemo(() => {
    if (activeType === "bridge") {
      return groupEntriesBySource(threadGroups.bridge, bt);
    }
    return [];
  }, [activeType, bt, threadGroups.bridge]);

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

  const closeSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedThreadIds([]);
  }, []);

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
    threadGroups.bridge.length === 0 &&
    threadGroups.general.length === 0
  ) {
    return null;
  }

  const renderThreadRow = ({
    thread,
    pendingClarification,
  }: (typeof activeGroup)[number]) => {
    const isActive =
      (pathname === "/workspace/chats" &&
        searchParams.get("thread") === thread.thread_id) ||
      pathname.endsWith(`/threads/${thread.thread_id}`);
    const bridgeInfo = bridgeInfoOfThread(thread);
    const bridgeLabel = bridgeInfo
      ? bridgePlatformLabel(bridgeInfo.platform, bt)
      : "";

    const selectionControl = selectionMode ? (
      <button
        type="button"
        aria-pressed={selectedThreadIds.includes(thread.thread_id)}
        className={cn(
          "selectionControl absolute right-3 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/92 text-foreground shadow-sm transition",
          selectedThreadIds.includes(thread.thread_id)
            ? "border-foreground bg-foreground text-background"
            : "hover:border-foreground/40 hover:bg-accent/40",
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleThreadSelection(thread.thread_id);
        }}
      >
        {selectedThreadIds.includes(thread.thread_id) ? (
          <span className="text-[11px] font-semibold">✓</span>
        ) : null}
      </button>
    ) : null;

    return (
      <SidebarMenuItem
        key={thread.thread_id}
        className="group/side-menu-item"
      >
        <SidebarMenuButton
          isActive={false}
          asChild
          className="h-auto overflow-visible bg-transparent p-0 hover:bg-transparent"
        >
          <div className="relative">
            <WorkspaceThreadListItem
              bridgeBadgeLabel={bt("bridge.bridgeChatBadge")}
              bridgeLabel={bridgeLabel}
              currentType={activeType}
              isActive={isActive}
              isSelected={selectedThreadIds.includes(thread.thread_id)}
              pendingLabel={
                pendingClarification ? t.sidebar.pendingReply : undefined
              }
              scope="sidebar"
              selectionMode={selectionMode}
              selectionVariant="overlay"
              thread={thread}
              onSelect={() => toggleThreadSelection(thread.thread_id)}
            />
            {selectionControl}
            {!selectionMode && env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY !== "true" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction
                    showOnHover
                    className="bg-background/55 hover:bg-background"
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
                  <DropdownMenuItem onSelect={() => handleShare(thread.thread_id)}>
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
                        onSelect={() => handleExport(thread, "markdown")}
                      >
                        <FileText className="text-muted-foreground" />
                        <span>{t.common.exportAsMarkdown}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleExport(thread, "json")}
                      >
                        <FileJson className="text-muted-foreground" />
                        <span>{t.common.exportAsJSON}</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleDelete(thread.thread_id)}>
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
  };

  const currentOpenSectionId =
    groupedSections.find((section) =>
      section.entries.some(({ thread }) => thread.thread_id === threadIdFromPath),
    )?.id ?? groupedSections[0]?.id;

  return (
    <>
      <SidebarGroup className="gap-1 pt-1">
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
              className="h-auto rounded-none px-0 py-0 text-xs font-medium text-muted-foreground shadow-none transition-colors hover:bg-transparent hover:text-foreground"
              onClick={() => {
                setSelectionMode((value) => !value);
                setSelectedThreadIds([]);
              }}
            >
              {selectionMode ? t.common.cancel : t.common.select}
            </Button>
          ) : null}
        </div>
        <SidebarGroupContent className="space-y-2 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
          <ThreadTypeTabs
            scope="sidebar"
            value={activeType}
            onValueChange={(nextType) => {
              setSelectedThreadIds([]);
              setSettings("layout", { recent_chat_tab: nextType });
            }}
            className="px-2"
          />
          {selectionMode ? (
            <div className="flex items-center justify-between gap-3 px-2 pt-1 text-[11px] text-muted-foreground">
              <span className="tracking-[0.01em] text-foreground/52">
                {t.chats.selectedCount.replace(
                  "{count}",
                  String(selectedThreadIds.length),
                )}
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto rounded-none px-0 py-0 text-[11px] font-medium text-foreground/66 shadow-none transition-colors hover:bg-transparent hover:text-foreground"
                  onClick={handleSelectAll}
                >
                  {t.common.selectAll}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto rounded-none px-0 py-0 text-[11px] font-medium text-amber-700/88 shadow-none transition-colors hover:bg-transparent hover:text-amber-700 dark:text-amber-300/88 dark:hover:text-amber-200"
                  onClick={closeSelectionMode}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto rounded-none px-0 py-0 text-[11px] font-medium text-destructive/80 shadow-none transition-colors hover:bg-transparent hover:text-destructive disabled:text-destructive/35"
                  disabled={selectedThreadIds.length === 0}
                  onClick={handleDeleteSelected}
                >
                  {t.common.delete}
                </Button>
              </div>
            </div>
          ) : null}
          <div key={activeType} className="animate-in fade-in-0 slide-in-from-bottom-1 pl-0 duration-300">
            <SidebarMenu className="gap-0">
              {groupedSections.length > 0 ? (
                <div className="space-y-1 px-2 pb-2">
                  {groupedSections.map((section) => (
                    <Collapsible
                      key={section.id}
                      defaultOpen={section.id === currentOpenSectionId}
                      className="group"
                    >
                      <CollapsibleTrigger className="group/header flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-foreground/88 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-0">
                        <span className="min-w-0 flex-1 truncate">
                          {section.label}
                        </span>
                        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground/90 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=open]/header:rotate-180 group-data-[state=open]/header:text-foreground/70" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:grid-rows-[1fr] data-[state=closed]:[&>div]:opacity-0 data-[state=closed]:[&>div]:-translate-y-1 data-[state=open]:[&>div]:opacity-100 data-[state=open]:[&>div]:translate-y-0 [&>div]:transition-all [&>div]:duration-300 [&>div]:ease-[cubic-bezier(0.22,1,0.36,1)]">
                        <div className="overflow-hidden">
                          <div className="ml-2 flex flex-col divide-y divide-border/45 border-l border-border/35 pl-2">
                            {section.entries.map(renderThreadRow)}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <div className="flex w-full flex-col divide-y divide-border/55 px-2 pb-2">
                  {activeGroup.map(renderThreadRow)}
                </div>
              )}
            </SidebarMenu>
          </div>
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
