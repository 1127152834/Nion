"use client";

import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { uuid } from "@/core/utils/uuid";

export function useThreadChat() {
  const { thread_id: threadIdFromPath } = useParams<{ thread_id?: string }>();
  const pathname = usePathname();

  const searchParams = useSearchParams();
  const threadIdFromQuery = searchParams.get("thread");
  const initialThreadId =
    threadIdFromQuery ?? threadIdFromPath ?? "new";
  const [threadId, setThreadId] = useState(() => {
    return initialThreadId === "new" ? uuid() : initialThreadId;
  });

  const [isNewThread, setIsNewThread] = useState(
    () => initialThreadId === "new",
  );

  useEffect(() => {
    const currentThread = searchParams.get("thread") ?? threadIdFromPath;
    if (currentThread === "new" || pathname.endsWith("/new")) {
      setIsNewThread(true);
      setThreadId(uuid());
      return;
    }

    // Guard: after history.replaceState updates the URL from /chats/new to
    // /chats/{UUID}, Next.js useParams may still return the stale "new" value
    // because replaceState does not trigger router updates. Avoid propagating
    // this invalid thread ID to downstream hooks, which would point history
    // and state loading back at the placeholder route.
    if (threadIdFromPath === "new") {
      return;
    }

    if (currentThread) {
      setIsNewThread(false);
      setThreadId(currentThread);
    }
  }, [pathname, searchParams, threadIdFromPath]);
  const isMock = searchParams.get("mock") === "true";
  return { threadId, isNewThread, setIsNewThread, isMock };
}
