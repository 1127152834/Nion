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
    } else if (currentThread) {
      setIsNewThread(false);
      setThreadId(currentThread);
    }
  }, [pathname, searchParams, threadIdFromPath]);
  const isMock = searchParams.get("mock") === "true";
  return { threadId, isNewThread, setIsNewThread, isMock };
}
