"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
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
import { useThreads } from "@/core/threads/hooks";
import { bridgeInfoOfThread, pathOfThread, titleOfThread } from "@/core/threads/utils";
import { formatTimeAgo } from "@/core/utils/datetime";

import ChatThreadPage from "./chat-thread-page";

function ChatsPageContent() {
  const { t } = useI18n();
  const { t: bt } = useBridgeTranslation();
  const searchParams = useSearchParams();
  const { data: threads } = useThreads();
  const [search, setSearch] = useState("");
  const selectedThread = searchParams.get("thread");

  useEffect(() => {
    document.title = `${t.pages.chats} - ${t.pages.appName}`;
  }, [t.pages.chats, t.pages.appName]);

  const filteredThreads = useMemo(() => {
    return threads?.filter((thread) => {
      return titleOfThread(thread).toLowerCase().includes(search.toLowerCase());
    });
  }, [threads, search]);

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
          <header className="flex shrink-0 items-center justify-center pt-8">
            <Input
              type="search"
              className="h-12 w-full max-w-(--container-width-md) text-xl"
              placeholder={t.chats.searchChats}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </header>
          <main className="min-h-0 flex-1">
            <ScrollArea className="size-full py-4">
              <div className="mx-auto flex size-full max-w-(--container-width-md) flex-col">
                {filteredThreads?.map((thread) => {
                  const updatedAtLabel = formatTimeAgo(thread.updated_at);
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
                    <Link
                      key={thread.thread_id}
                      href={pathOfThread(thread.thread_id)}
                    >
                      <div className="flex flex-col gap-2 border-b p-4">
                        <div className="flex items-center gap-2">
                          <div>{titleOfThread(thread)}</div>
                          {bridgeInfo ? (
                            <Badge variant="outline">
                              {bt("bridge.bridgeChatBadge")} · {bridgeLabel}
                            </Badge>
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
