"use client";

import { useEffect } from "react";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { ArtifactsProvider } from "@/components/workspace/artifacts";
import ChatThreadPage from "@/app/workspace/chats/chat-thread-page";
import { SubtasksProvider } from "@/core/tasks/context";

export default function WorkspaceProjectThreadPage() {
  useEffect(() => {
    document.title = "Project Chat - Nion";
  }, []);

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
