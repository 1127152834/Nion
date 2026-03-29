"use client";

import { useEffect } from "react";

import ChatThreadPage from "@/app/workspace/chats/chat-thread-page";

export default function WorkspaceProjectThreadPage() {
  useEffect(() => {
    document.title = "Project Chat - Nion";
  }, []);

  return <ChatThreadPage />;
}

