"use client";

import { BookPlusIcon, SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/core/i18n/hooks";
import { extractContentFromMessage } from "@/core/messages/utils";
import { pathOfNotebookSeededCreate } from "@/core/navigation/desktop-routes";
import { formatThreadAsMarkdown } from "@/core/threads/export";
import type { AgentThread } from "@/core/threads/types";

import { useThread } from "./messages/context";
import { Tooltip } from "./tooltip";

export function SaveToNotebookTrigger({ threadId }: { threadId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { thread } = useThread();

  const messages = thread.messages;

  const handleSaveThreadToNotebook = useCallback(() => {
    if (messages.length === 0) {
      toast.error(t.conversation.noMessages);
      return;
    }

    const agentThread = {
      thread_id: threadId,
      updated_at: new Date().toISOString(),
      values: thread.values,
    } as AgentThread;

    router.push(
      pathOfNotebookSeededCreate({
        title: thread.values.title || t.pages.untitled,
        body: formatThreadAsMarkdown(agentThread, messages),
        directory: "",
      }),
    );
  }, [messages, router, t, thread.values, threadId]);

  const handleSaveLastReplyToNotebook = useCallback(() => {
    const lastAi = [...messages].reverse().find((message) => message.type === "ai");
    const content = lastAi ? extractContentFromMessage(lastAi) : "";
    if (!content.trim()) {
      toast.error(t.conversation.noMessages);
      return;
    }

    router.push(
      pathOfNotebookSeededCreate({
        title: thread.values.title || t.pages.untitled,
        body: content,
        directory: "",
      }),
    );
  }, [messages, router, t, thread.values.title]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <Tooltip content={t.notebookPage.saveFromChat}>
        <DropdownMenuTrigger asChild>
          <Button className="text-muted-foreground hover:text-foreground" variant="ghost">
            <BookPlusIcon className="size-4" />
            {t.notebookPage.saveFromChat}
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleSaveThreadToNotebook}>
          <BookPlusIcon className="text-muted-foreground size-4" />
          <span>{t.notebookPage.saveFromChat}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleSaveLastReplyToNotebook}>
          <SaveIcon className="text-muted-foreground size-4" />
          <span>{t.notebookPage.saveLastReply}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
