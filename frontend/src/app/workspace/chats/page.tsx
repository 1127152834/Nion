"use client";

import { Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArtifactsProvider } from "@/components/workspace/artifacts";
import { useBridgeTranslation } from "@/components/workspace/bridge/useBridgeTranslation";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
import { useI18n } from "@/core/i18n/hooks";
import { SubtasksProvider } from "@/core/tasks/context";
import { useDeleteThreads, useThreads } from "@/core/threads/hooks";
import {
  bridgeInfoOfThread,
  pathOfProjectThread,
  pathOfThread,
  projectInfoOfThread,
  titleOfThread,
} from "@/core/threads/utils";
import { formatTimeAgo } from "@/core/utils/datetime";

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

  useEffect(() => {
    document.title = `${t.pages.chats} - ${t.pages.appName}`;
  }, [t.pages.chats, t.pages.appName]);

  const filteredThreads = useMemo(() => {
    return threads?.filter((thread) => {
      return titleOfThread(thread).toLowerCase().includes(search.toLowerCase());
    });
  }, [threads, search]);

  const toggleThreadSelection = (threadId: string) => {
    setSelectedThreadIds((current) =>
      current.includes(threadId)
        ? current.filter((id) => id !== threadId)
        : [...current, threadId],
    );
  };

  const handleSelectAll = () => {
    const ids = (filteredThreads ?? []).map((thread) => thread.thread_id);
    setSelectedThreadIds((current) =>
      current.length === ids.length ? [] : ids,
    );
  };

  const handleDeleteSelected = () => {
    if (selectedThreadIds.length === 0) {
      return;
    }
    const deletedIds = [...selectedThreadIds];
    const remainingThreads = (filteredThreads ?? []).filter(
      (thread) => !deletedIds.includes(thread.thread_id),
    );
    deleteThreads({ threadIds: deletedIds });
    setSelectedThreadIds([]);
    setSelectionMode(false);
    if (selectedThread && deletedIds.includes(selectedThread)) {
      void router.push(pathOfThread(remainingThreads[0]?.thread_id ?? "new"));
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
          <header className="mx-auto flex w-full max-w-(--container-width-md) shrink-0 items-center gap-3 pt-8">
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
                {filteredThreads?.map((thread) => {
                  const updatedAtLabel = formatTimeAgo(thread.updated_at);
                  const isSelected = selectedThreadIds.includes(thread.thread_id);
                  const bridgeInfo = bridgeInfoOfThread(thread);
                  const projectInfo = projectInfoOfThread(thread);
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

                  return selectionMode ? (
                    <button
                      key={thread.thread_id}
                      type="button"
                      className="flex w-full items-center gap-3 border-b p-4 text-left"
                      onClick={() => toggleThreadSelection(thread.thread_id)}
                    >
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-foreground bg-foreground text-background" : "border-border bg-background"}`}
                      >
                        {isSelected ? <Check className="size-3" /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1">
                          <div className="truncate">{titleOfThread(thread)}</div>
                          {projectInfo ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                项目 · {projectInfo.project_name}
                              </Badge>
                            </div>
                          ) : null}
                          {bridgeInfo ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {bt("bridge.bridgeChatBadge")} · {bridgeLabel}
                              </Badge>
                            </div>
                          ) : null}
                        </div>
                        {updatedAtLabel ? (
                          <div className="text-muted-foreground text-sm">
                            {updatedAtLabel}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  ) : (
                    <Link
                      key={thread.thread_id}
                      href={
                        projectInfo
                          ? pathOfProjectThread(projectInfo.project_id, thread.thread_id)
                          : pathOfThread(thread.thread_id)
                      }
                    >
                      <div className="flex flex-col gap-2 border-b p-4">
                        <div className="flex flex-col gap-1">
                          <div>{titleOfThread(thread)}</div>
                          {projectInfo ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                项目 · {projectInfo.project_name}
                              </Badge>
                            </div>
                          ) : null}
                          {bridgeInfo ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {bt("bridge.bridgeChatBadge")} · {bridgeLabel}
                              </Badge>
                            </div>
                          ) : null}
                        </div>
                        {updatedAtLabel ? (
                          <div className="text-muted-foreground text-sm">
                            {updatedAtLabel}
                          </div>
                        ) : null}
                      </div>
                    </Link>
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
