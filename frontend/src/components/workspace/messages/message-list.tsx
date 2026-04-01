import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { useI18n } from "@/core/i18n/hooks";
import { getTaskToolCallIds } from "@/core/messages/tool-calls";
import {
  extractContentFromMessage,
  extractPresentFilesFromMessage,
  extractTextFromMessage,
  groupMessages,
  hasContent,
  hasPresentFiles,
  hasReasoning,
} from "@/core/messages/utils";
import { useRehypeSplitWordsIntoSpans } from "@/core/rehype";
import type { Subtask } from "@/core/tasks";
import { useUpdateSubtask } from "@/core/tasks/context";
import type {
  AgentThreadState,
  BaseStream,
  PendingClarification,
  PendingPermissionRequest,
} from "@/core/threads";
import { cn } from "@/lib/utils";

import { ArtifactFileList } from "../artifacts/artifact-file-list";
import { EventTaskDraftCard } from "../automation/event-task-draft-card";
import { StreamingIndicator } from "../streaming-indicator";

import { ClarificationCard } from "./clarification-card";
import { MarkdownContent } from "./markdown-content";
import { MessageGroup } from "./message-group";
import { MessageListItem } from "./message-list-item";
import { PermissionRequestCard } from "./permission-request-card";
import { MessageListSkeleton } from "./skeleton";
import { SubtaskCard } from "./subtask-card";
import { ToolActivitySummaryCard } from "./tool-activity-summary-card";

export function MessageList({
  className,
  threadId,
  thread,
  pendingClarification = null,
  pendingPermissionRequest = null,
  onClarificationSelect,
  onPermissionDecision,
  isResolvingPermission = false,
  paddingBottom = 160,
}: {
  className?: string;
  threadId: string;
  thread: BaseStream<AgentThreadState>;
  pendingClarification?: PendingClarification | null;
  pendingPermissionRequest?: PendingPermissionRequest | null;
  onClarificationSelect?: (option: string) => void;
  onPermissionDecision?: (decision: "allow" | "allow_session" | "deny") => void;
  isResolvingPermission?: boolean;
  paddingBottom?: number;
}) {
  const { t } = useI18n();
  const rehypePlugins = useRehypeSplitWordsIntoSpans(thread.isLoading);
  const updateSubtask = useUpdateSubtask();
  const messages = thread.messages;
  if (thread.isThreadLoading && messages.length === 0) {
    return <MessageListSkeleton />;
  }
  return (
    <Conversation
      className={cn("flex size-full flex-col justify-center", className)}
    >
      <ConversationContent className="mx-auto w-full max-w-(--container-width-md) gap-8 pt-12">
        {groupMessages(messages, (group) => {
          if (group.type === "human" || group.type === "assistant") {
            return group.messages.map((msg) => {
              return (
                <MessageListItem
                  key={`${group.id}/${msg.id}`}
                  message={msg}
                  isLoading={thread.isLoading}
                />
              );
            });
          } else if (group.type === "assistant:clarification") {
            const message = group.messages[0];
            if (
              pendingClarification &&
              message?.id === pendingClarification.toolMessageId
            ) {
              return (
                <ClarificationCard
                  key={group.id}
                  clarification={pendingClarification}
                  onSelect={onClarificationSelect}
                />
              );
            }
            if (message && hasContent(message)) {
              return (
                <MarkdownContent
                  key={group.id}
                  content={extractContentFromMessage(message)}
                  isLoading={thread.isLoading}
                  rehypePlugins={rehypePlugins}
                />
              );
            }
            return null;
          } else if (group.type === "assistant:permission-request") {
            const message = group.messages[0];
            if (
              pendingPermissionRequest &&
              message?.id === pendingPermissionRequest.toolMessageId
            ) {
              return (
                <PermissionRequestCard
                  key={group.id}
                  permissionRequest={pendingPermissionRequest}
                  onDecision={onPermissionDecision}
                  isResolving={isResolvingPermission}
                />
              );
            }
            if (message && hasContent(message)) {
              return (
                <MarkdownContent
                  key={group.id}
                  content={extractContentFromMessage(message)}
                  isLoading={thread.isLoading}
                  rehypePlugins={rehypePlugins}
                />
              );
            }
            return null;
          } else if (group.type === "assistant:present-files") {
            const files: string[] = [];
            for (const message of group.messages) {
              if (hasPresentFiles(message)) {
                const presentFiles = extractPresentFilesFromMessage(message);
                files.push(...presentFiles);
              }
            }
            return (
              <div className="w-full" key={group.id}>
                {group.messages[0] && hasContent(group.messages[0]) && (
                  <MarkdownContent
                    content={extractContentFromMessage(group.messages[0])}
                    isLoading={thread.isLoading}
                    rehypePlugins={rehypePlugins}
                    className="mb-4"
                  />
                )}
                <ArtifactFileList files={files} threadId={threadId} />
              </div>
            );
          } else if (group.type === "assistant:automation-draft") {
            const message = group.messages[0];
            const draft = message?.additional_kwargs?.draft;
            if (!draft || typeof draft !== "object") {
              return null;
            }
            return (
              <EventTaskDraftCard
                key={group.id}
                draft={draft as never}
              />
            );
          } else if (group.type === "assistant:subagent") {
            const tasks = new Set<Subtask>();
            for (const message of group.messages) {
              if (message.type === "ai") {
                for (const toolCall of message.tool_calls ?? []) {
                  if (toolCall.name === "task") {
                    const task: Subtask = {
                      id: toolCall.id!,
                      subagent_type: toolCall.args.subagent_type ?? "",
                      description: toolCall.args.description ?? "",
                      prompt: toolCall.args.prompt ?? "",
                      status: "in_progress",
                    };
                    updateSubtask(task);
                    tasks.add(task);
                  }
                }
              } else if (message.type === "tool") {
                const taskId = message.tool_call_id;
                if (taskId) {
                  const result = extractTextFromMessage(message);
                  if (result.startsWith("Task Succeeded. Result:")) {
                    updateSubtask({
                      id: taskId,
                      status: "completed",
                      result: result
                        .split("Task Succeeded. Result:")[1]
                        ?.trim(),
                    });
                  } else if (result.startsWith("Task failed.")) {
                    updateSubtask({
                      id: taskId,
                      status: "failed",
                      error: result.split("Task failed.")[1]?.trim(),
                    });
                  } else if (result.startsWith("Task timed out")) {
                    updateSubtask({
                      id: taskId,
                      status: "failed",
                      error: result,
                    });
                  } else {
                    updateSubtask({
                      id: taskId,
                      status: "in_progress",
                    });
                  }
                }
              }
            }
            const results: React.ReactNode[] = [];
            for (const message of group.messages.filter(
              (message) => message.type === "ai",
            )) {
              if (hasReasoning(message)) {
                results.push(
                  <MessageGroup
                    key={"thinking-group-" + message.id}
                    messages={[message]}
                    isLoading={thread.isLoading}
                  />,
                );
              }
              results.push(
                <div
                  key="subtask-count"
                  className="text-muted-foreground font-norma pt-2 text-sm"
                >
                  {t.subtasks.executing(tasks.size)}
                </div>,
              );
              const taskIds = getTaskToolCallIds(message.tool_calls);
              for (const taskId of taskIds ?? []) {
                results.push(
                  <SubtaskCard
                    key={"task-group-" + taskId}
                    taskId={taskId}
                    isLoading={thread.isLoading}
                  />,
                );
              }
            }
            return (
              <div
                key={"subtask-group-" + group.id}
                className="relative z-1 flex flex-col gap-2"
              >
                {results}
              </div>
            );
          } else if (group.type === "assistant:tool-activity-summary") {
            const message = group.messages[0];
            const toolNames = Array.isArray(
              message?.additional_kwargs?.tool_names,
            )
              ? (message?.additional_kwargs?.tool_names as string[])
              : [];
            const resultClass =
              typeof message?.additional_kwargs?.result_class === "string"
                ? (message.additional_kwargs.result_class as string)
                : undefined;
            return (
              <ToolActivitySummaryCard
                key={`tool-activity-${group.id}`}
                summaryLabel={extractTextFromMessage(message!)}
                toolNames={toolNames}
                resultClass={resultClass}
              />
            );
          }
          return (
            <MessageGroup
              key={"group-" + group.id}
              messages={group.messages}
              isLoading={thread.isLoading}
            />
          );
        })}
        {thread.isLoading && <StreamingIndicator className="my-4" />}
        <div style={{ height: `${paddingBottom}px` }} />
      </ConversationContent>
    </Conversation>
  );
}
