"use client";

import { Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArtifactsProvider } from "@/components/workspace/artifacts";
import {
  bridgePlatformLabel,
  useBridgeTranslation,
} from "@/components/workspace/bridge/useBridgeTranslation";
import { WorkspaceThreadListItem } from "@/components/workspace/thread-list-items";
import { ThreadTypeTabs } from "@/components/workspace/thread-type-tabs";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
import { useI18n } from "@/core/i18n/hooks";
import { SubtasksProvider } from "@/core/tasks/context";
import {
  filterThreadsByWorkspaceType,
  groupThreadsByWorkspaceType,
  resolveWorkspaceThreadType,
} from "@/core/threads";
import { useDeleteThreads, useThreads } from "@/core/threads/hooks";
import {
  bridgeInfoOfThread,
  pathOfChatHistoryType,
  pathOfThread,
  titleOfThread,
} from "@/core/threads/utils";

import ChatThreadPage from "./chat-thread-page";

function ChatsPageContent() {
  const { t } = useI18n();
  const { t: bt } = useBridgeTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: threads } = useThreads();
  const { mutate: deleteThreads } = useDeleteThreads();
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const selectedThread = searchParams.get("thread");
  const activeType = resolveWorkspaceThreadType({
    pathname: "/workspace/chats",
    value: searchParams.get("type"),
  });

  useEffect(() => {
    document.title = `${t.pages.chats} - ${t.pages.appName}`;
  }, [t.pages.chats, t.pages.appName]);

  const threadGroups = useMemo(
    () =>
      groupThreadsByWorkspaceType(
        (threads ?? []).map((thread) => ({
          thread,
          pendingClarification: false,
        })),
      ),
    [threads],
  );

  const filteredThreads = useMemo(
    () =>
      filterThreadsByWorkspaceType(threadGroups, activeType).filter(({ thread }) =>
        titleOfThread(thread).toLowerCase().includes(search.toLowerCase()),
      ),
    [activeType, search, threadGroups],
  );

  const toggleThreadSelection = (threadId: string) => {
    setSelectedThreadIds((current) =>
      current.includes(threadId)
        ? current.filter((id) => id !== threadId)
        : [...current, threadId],
    );
  };

  const handleSelectAll = () => {
    const ids = filteredThreads.map(({ thread }) => thread.thread_id);
    setSelectedThreadIds((current) =>
      current.length === ids.length ? [] : ids,
    );
  };

  const handleDeleteSelected = () => {
    if (selectedThreadIds.length === 0) {
      return;
    }
    const deletedIds = [...selectedThreadIds];
    const remainingThreads = filteredThreads.filter(
      ({ thread }) => !deletedIds.includes(thread.thread_id),
    );
    deleteThreads({ threadIds: deletedIds });
    setSelectedThreadIds([]);
    setSelectionMode(false);
    if (selectedThread && deletedIds.includes(selectedThread)) {
      void router.push(
        pathOfThread(remainingThreads[0]?.thread.thread_id ?? "new", {
          type: activeType,
        }),
      );
    }
  };

  if (selectedThread) {
    return (
      <SubtasksProvider>
        <ArtifactsProvider>
          <PromptInputProvider>
            <ChatThreadPage />
          </PromptInputProvider>
        </ArtifactsProvider>
      </SubtasksProvider>
    );
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader></WorkspaceHeader>
      <WorkspaceBody>
        <div className="flex size-full flex-col">
          <header className="mx-auto flex w-full max-w-(--container-width-md) shrink-0 flex-col gap-4 pt-8">
            <ThreadTypeTabs
              scope="page"
              value={activeType}
              onValueChange={(nextType) => {
                setSelectedThreadIds([]);
                void router.push(pathOfChatHistoryType(nextType));
              }}
            />
            <div className="flex items-center gap-3">
              <Input
                type="search"
                className="h-12 flex-1 text-xl"
                placeholder={t.chats.searchChats}
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-full px-3 text-xs text-muted-foreground"
                onClick={() => {
                  setSelectionMode((value) => !value);
                  setSelectedThreadIds([]);
                }}
              >
                {selectionMode ? t.common.cancel : t.common.select}
              </Button>
            </div>
          </header>
          <main className="min-h-0 flex-1">
            <ScrollArea className="size-full py-4">
              <div className="mx-auto flex size-full max-w-(--container-width-md) flex-col">
                {selectionMode ? (
                  <div className="mb-3 flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                    <span>
                      {t.chats.selectedCount.replace(
                        "{count}",
                        String(selectedThreadIds.length),
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-3 text-xs"
                        onClick={handleSelectAll}
                      >
                        {t.common.selectAll}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-3 text-xs"
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
                        className="h-8 rounded-full px-3 text-xs text-destructive"
                        disabled={selectedThreadIds.length === 0}
                        onClick={handleDeleteSelected}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        {t.common.delete}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {filteredThreads.map(({ thread }) => {
                  const bridgeInfo = bridgeInfoOfThread(thread);
                  const bridgeLabel = bridgeInfo
                    ? bridgePlatformLabel(bridgeInfo.platform, bt)
                    : "";

                  return (
                    <WorkspaceThreadListItem
                      key={thread.thread_id}
                      bridgeBadgeLabel={bt("bridge.bridgeChatBadge")}
                      bridgeLabel={bridgeLabel}
                      currentType={activeType}
                      isActive={false}
                      isSelected={selectedThreadIds.includes(thread.thread_id)}
                      scope="page"
                      selectionMode={selectionMode}
                      thread={thread}
                      onSelect={() => toggleThreadSelection(thread.thread_id)}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </main>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={null}>
      <ChatsPageContent />
    </Suspense>
  );
}
