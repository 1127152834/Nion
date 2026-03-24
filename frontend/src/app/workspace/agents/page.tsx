"use client";

import { useSearchParams } from "next/navigation";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { ArtifactsProvider } from "@/components/workspace/artifacts";
import { AgentGallery } from "@/components/workspace/agents/agent-gallery";
import { SubtasksProvider } from "@/core/tasks/context";

import AgentChatPage from "./agent-chat-page";

export default function AgentsPage() {
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
