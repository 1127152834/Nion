"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { AgentGallery } from "@/components/workspace/agents/agent-gallery";
import { ArtifactsProvider } from "@/components/workspace/artifacts";
import { SubtasksProvider } from "@/core/tasks/context";

import AgentChatPage from "./agent-chat-page";

function AgentsPageContent() {
  const searchParams = useSearchParams();
  const selectedAgent = searchParams.get("agent");
  const selectedThread = searchParams.get("thread");

  if (selectedAgent && selectedThread) {
    return (
      <SubtasksProvider>
        <ArtifactsProvider>
          <PromptInputProvider>
            <AgentChatPage />
          </PromptInputProvider>
        </ArtifactsProvider>
      </SubtasksProvider>
    );
  }

  return <AgentGallery />;
}

export default function AgentsPage() {
  return (
    <Suspense fallback={null}>
      <AgentsPageContent />
    </Suspense>
  );
}
