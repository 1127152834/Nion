import type { Message } from "../threads";

const INTERNAL_SUMMARY_PREFIX = "Here is a summary of the conversation to date:";
const INTERNAL_SUMMARY_TITLE = "conversation summary";
const INTERNAL_SUMMARY_SECTION_HEADINGS = [
  "goal",
  "confirmed decisions",
  "constraints",
  "completed work",
  "remaining open questions",
] as const;
const SELECTED_CLI_TOOLS_TAG_RE = /<selected_cli_tools>[\s\S]*?<\/selected_cli_tools>/g;

interface GenericMessageGroup<T = string> {
  type: T;
  id: string | undefined;
  messages: Message[];
}

interface HumanMessageGroup extends GenericMessageGroup<"human"> {}

interface AssistantProcessingGroup extends GenericMessageGroup<"assistant:processing"> {}

interface AssistantMessageGroup extends GenericMessageGroup<"assistant"> {}

interface AssistantPresentFilesGroup extends GenericMessageGroup<"assistant:present-files"> {}

interface AssistantClarificationGroup extends GenericMessageGroup<"assistant:clarification"> {}

interface AssistantPermissionRequestGroup extends GenericMessageGroup<"assistant:permission-request"> {}

interface AssistantSubagentGroup extends GenericMessageGroup<"assistant:subagent"> {}

interface AssistantToolActivitySummaryGroup
  extends GenericMessageGroup<"assistant:tool-activity-summary"> {}

interface InternalSummaryGroup
  extends GenericMessageGroup<"system:internal-summary"> {}

type MessageGroup =
  | HumanMessageGroup
  | AssistantProcessingGroup
  | AssistantMessageGroup
  | AssistantPresentFilesGroup
  | AssistantClarificationGroup
  | AssistantPermissionRequestGroup
  | AssistantSubagentGroup
  | AssistantToolActivitySummaryGroup
  | InternalSummaryGroup;

export function groupMessages<T>(
  messages: Message[],
  mapper: (group: MessageGroup, index: number) => T,
): T[] {
  if (messages.length === 0) {
    return [];
  }

  const groups: MessageGroup[] = [];

  // Returns the last group if it can still accept tool messages
  // (i.e. it's an in-flight processing group, not a terminal human/assistant group).
  function lastOpenGroup() {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.type !== "human" &&
      last.type !== "assistant" &&
      last.type !== "assistant:clarification"
    ) {
      return last;
    }
    return null;
  }

  for (const message of messages) {
    if (isInternalSummaryMessage(message)) {
      groups.push({
        id: message.id,
        type: "system:internal-summary",
        messages: [message],
      });
      continue;
    }

    if (message.name === "todo_reminder") {
      continue;
    }

    if (message.type === "human") {
      groups.push({ id: message.id, type: "human", messages: [message] });
      continue;
    }

    if (message.type === "tool") {
      if (isClarificationToolMessage(message)) {
        // Add to the preceding processing group to preserve tool-call association,
        // then also open a standalone clarification group for prominent display.
        lastOpenGroup()?.messages.push(message);
        groups.push({
          id: message.id,
          type: "assistant:clarification",
          messages: [message],
        });
      } else if (isPermissionRequestToolMessage(message)) {
        lastOpenGroup()?.messages.push(message);
        groups.push({
          id: message.id,
          type: "assistant:permission-request",
          messages: [message],
        });
      } else {
        const open = lastOpenGroup();
        if (open) {
          open.messages.push(message);
        } else {
          console.error(
            "Unexpected tool message outside a processing group",
            message,
          );
        }
      }
      continue;
    }

    if (message.type === "tool_activity_summary") {
      groups.push({
        id: message.id,
        type: "assistant:tool-activity-summary",
        messages: [message],
      });
      continue;
    }

    if (message.type === "ai") {
      if (hasPresentFiles(message)) {
        groups.push({
          id: message.id,
          type: "assistant:present-files",
          messages: [message],
        });
      } else if (hasSubagent(message)) {
        groups.push({
          id: message.id,
          type: "assistant:subagent",
          messages: [message],
        });
      } else if (hasReasoning(message) || hasToolCalls(message)) {
        const lastGroup = groups[groups.length - 1];
        // Accumulate consecutive intermediate AI messages into one processing group.
        if (lastGroup?.type !== "assistant:processing") {
          groups.push({
            id: message.id,
            type: "assistant:processing",
            messages: [message],
          });
        } else {
          lastGroup.messages.push(message);
        }
      }

      // Not an else-if: a message with reasoning + content (but no tool calls) goes
      // into the processing group above AND gets its own assistant bubble here.
      if (hasContent(message) && !hasToolCalls(message)) {
        groups.push({ id: message.id, type: "assistant", messages: [message] });
      }
    }
  }

  return groups
    .map((group, index) => mapper(group, index))
    .filter((result) => result !== undefined && result !== null) as T[];
}

export function extractTextFromMessage(message: Message) {
  if (isInternalSummaryMessage(message)) {
    return "";
  }
  if (typeof message.content === "string") {
    return splitInlineReasoningFromAIMessage(message)?.content ?? message.content.trim();
  }
  if (Array.isArray(message.content)) {
    return message.content
      .map((content) =>
        content.type === "text" && "text" in content ? content.text : "",
      )
      .join("\n")
      .trim();
  }
  return "";
}

const THINK_TAG_RE = /<think>\s*([\s\S]*?)\s*<\/think>/g;

function splitInlineReasoning(content: string) {
  const reasoningParts: string[] = [];
  const cleaned = content
    .replace(THINK_TAG_RE, (_, reasoning: string) => {
      const normalized = reasoning.trim();
      if (normalized) {
        reasoningParts.push(normalized);
      }
      return "";
    })
    .trim();

  return {
    content: cleaned,
    reasoning: reasoningParts.length > 0 ? reasoningParts.join("\n\n") : null,
  };
}

function splitInlineReasoningFromAIMessage(message: Message) {
  if (message.type !== "ai" || typeof message.content !== "string") {
    return null;
  }
  return splitInlineReasoning(message.content);
}

export function extractContentFromMessage(message: Message) {
  if (isInternalSummaryMessage(message)) {
    return "";
  }
  if (typeof message.content === "string") {
    const content = splitInlineReasoningFromAIMessage(message)?.content ?? message.content.trim();
    return stripInternalSelectedCliToolsTag(content);
  }
  if (Array.isArray(message.content)) {
    return message.content
      .map((content) => {
        if (content.type === "text" && typeof content.text === "string") {
          return content.text;
        }
        if (
          content.type === "image_url" &&
          (typeof content.image_url === "string" ||
            (typeof content.image_url === "object" &&
              content.image_url !== null &&
              "url" in content.image_url))
        ) {
          const imageURL = extractURLFromImageURLContent(content.image_url);
          return `![image](${imageURL})`;
        }
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
}

export function extractReasoningContentFromMessage(message: Message) {
  if (message.type !== "ai") {
    return null;
  }
  if (
    message.additional_kwargs &&
    "reasoning_content" in message.additional_kwargs
  ) {
    return message.additional_kwargs.reasoning_content as string | null;
  }
  if (Array.isArray(message.content)) {
    const part = message.content[0];
    if (part && "thinking" in part && typeof part.thinking === "string") {
      return part.thinking;
    }
  }
  if (typeof message.content === "string") {
    return splitInlineReasoning(message.content).reasoning;
  }
  return null;
}

export function removeReasoningContentFromMessage(message: Message) {
  if (message.type !== "ai" || !message.additional_kwargs) {
    return;
  }
  delete message.additional_kwargs.reasoning_content;
}

export function extractURLFromImageURLContent(
  content:
    | string
    | {
        url: string;
      },
) {
  if (typeof content === "string") {
    return content;
  }
  return content.url;
}

export function hasContent(message: Message) {
  if (isInternalSummaryMessage(message)) {
    return false;
  }
  if (typeof message.content === "string") {
    return (
      splitInlineReasoningFromAIMessage(message)?.content ?? message.content.trim()
    ).length > 0;
  }
  if (Array.isArray(message.content)) {
    return message.content.length > 0;
  }
  return false;
}

function hasInternalSummaryMetadata(message: Message) {
  return message.additional_kwargs?.internal_summary === true;
}

export function isInternalSummaryMessage(message: Message) {
  if (message.type !== "human") {
    return false;
  }
  if (hasInternalSummaryMetadata(message)) {
    return true;
  }
  if (typeof message.content !== "string") {
    return false;
  }

  const normalized = message.content.trimStart();
  if (normalized.startsWith(INTERNAL_SUMMARY_PREFIX)) {
    return true;
  }

  return isStructuredInternalSummary(normalized);
}

export function extractInternalSummaryContent(message: Message) {
  if (!isInternalSummaryMessage(message)) {
    return "";
  }
  if (typeof message.content === "string") {
    return message.content.trim();
  }
  return "";
}

function isStructuredInternalSummary(content: string) {
  const normalized = content.trim().toLowerCase();
  if (!normalized.startsWith(INTERNAL_SUMMARY_TITLE)) {
    return false;
  }

  return INTERNAL_SUMMARY_SECTION_HEADINGS.some((heading) =>
    normalized.includes(`## ${heading}`),
  );
}

export function hasReasoning(message: Message) {
  if (message.type !== "ai") {
    return false;
  }
  if (typeof message.additional_kwargs?.reasoning_content === "string") {
    return true;
  }
  if (Array.isArray(message.content)) {
    const part = message.content[0];
    // Compatible with the Anthropic gateway
    return part?.type === "thinking";
  }
  if (typeof message.content === "string") {
    return splitInlineReasoning(message.content).reasoning !== null;
  }
  return false;
}

export function hasToolCalls(message: Message) {
  return (
    message.type === "ai" && message.tool_calls && message.tool_calls.length > 0
  );
}

export function hasPresentFiles(message: Message) {
  return (
    message.type === "ai" &&
    message.tool_calls?.some((toolCall) => toolCall.name === "present_files")
  );
}

export function isClarificationToolMessage(message: Message) {
  return message.type === "tool" && message.name === "ask_clarification";
}

export function isPermissionRequestToolMessage(message: Message) {
  return message.type === "tool" && message.name === "permission_request";
}

export function extractPresentFilesFromMessage(message: Message) {
  if (message.type !== "ai" || !hasPresentFiles(message)) {
    return [];
  }
  const files: string[] = [];
  for (const toolCall of message.tool_calls ?? []) {
    if (
      toolCall.name === "present_files" &&
      Array.isArray(toolCall.args.filepaths)
    ) {
      files.push(...toolCall.args.filepaths);
    }
  }
  return files;
}

export function hasSubagent(message: Message) {
  if (message.type !== "ai") {
    return false;
  }
  for (const toolCall of message.tool_calls ?? []) {
    if (toolCall.name === "task") {
      return true;
    }
  }
  return false;
}

export function findToolCallResult(toolCallId: string, messages: Message[]) {
  for (const message of messages) {
    if (message.type === "tool" && message.tool_call_id === toolCallId) {
      const content = extractTextFromMessage(message);
      if (content) {
        return content;
      }
    }
  }
  return undefined;
}

export function extractKnowledgePageIdsFromToolMessage(message: Message) {
  const knowledgeSources = message.additional_kwargs?.knowledge_sources;
  if (Array.isArray(knowledgeSources)) {
    return knowledgeSources.filter((item): item is string => typeof item === "string");
  }
  if (message.type !== "tool" || message.name !== "query_knowledge_base") {
    return [];
  }
  const content = extractTextFromMessage(message);
  if (!content) {
    return [];
  }
  try {
    const payload = JSON.parse(content) as { page_ids?: unknown };
    if (!Array.isArray(payload.page_ids)) {
      return [];
    }
    return payload.page_ids.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

/**
 * Represents a file stored in message additional_kwargs.files.
 * Used for optimistic UI (uploading state) and structured file metadata.
 */
export interface FileInMessage {
  filename: string;
  size: number; // bytes
  path?: string; // virtual path, may not be set during upload
  status?: "uploading" | "uploaded";
}

export interface ShortcutSelectionsInMessage {
  contexts: Array<{ value: string; kind: "file" | "directory" }>;
  skills: string[];
  mcpTools: string[];
  cliTools: string[];
}

export function extractShortcutSelectionsFromMessage(
  message: Message,
): ShortcutSelectionsInMessage | null {
  const source = message.additional_kwargs?.shortcut_selections;
  if (!source || typeof source !== "object") {
    return null;
  }

  const payload = source as {
    contexts?: unknown;
    skills?: unknown;
    mcpTools?: unknown;
    cliTools?: unknown;
  };

  const contexts = Array.isArray(payload.contexts)
    ? payload.contexts
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const value = (item as { value?: unknown }).value;
          const kind = (item as { kind?: unknown }).kind;
          if (
            typeof value !== "string" ||
            (kind !== "file" && kind !== "directory")
          ) {
            return null;
          }
          return { value, kind } as { value: string; kind: "file" | "directory" };
        })
        .filter(
          (item): item is { value: string; kind: "file" | "directory" } =>
            item !== null,
        )
    : [];

  const skills = Array.isArray(payload.skills)
    ? payload.skills.filter((item): item is string => typeof item === "string")
    : [];
  const mcpTools = Array.isArray(payload.mcpTools)
    ? payload.mcpTools.filter((item): item is string => typeof item === "string")
    : [];
  const cliTools = Array.isArray(payload.cliTools)
    ? payload.cliTools.filter((item): item is string => typeof item === "string")
    : [];

  if (
    contexts.length === 0 &&
    skills.length === 0 &&
    mcpTools.length === 0 &&
    cliTools.length === 0
  ) {
    return null;
  }

  return { contexts, skills, mcpTools, cliTools };
}

/**
 * Strip <uploaded_files> tag from message content.
 * Returns the content with the tag removed.
 */
export function stripUploadedFilesTag(content: string): string {
  return content
    .replace(/<uploaded_files>[\s\S]*?<\/uploaded_files>/g, "")
    .replace(SELECTED_CLI_TOOLS_TAG_RE, "")
    .trim();
}

export function stripInternalSelectedCliToolsTag(content: string): string {
  return content.replace(SELECTED_CLI_TOOLS_TAG_RE, "").trim();
}

export function parseUploadedFiles(content: string): FileInMessage[] {
  // Match <uploaded_files>...</uploaded_files> tag
  const uploadedFilesRegex = /<uploaded_files>([\s\S]*?)<\/uploaded_files>/;
  // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
  const match = content.match(uploadedFilesRegex);

  if (!match) {
    return [];
  }

  const uploadedFilesContent = match[1];

  // Check if it's "No files have been uploaded yet."
  if (uploadedFilesContent?.includes("No files have been uploaded yet.")) {
    return [];
  }

  // Check if the backend reported no new files were uploaded in this message
  if (uploadedFilesContent?.includes("(empty)")) {
    return [];
  }

  // Parse file list
  // Format: - filename (size)\n  Path: /path/to/file
  const fileRegex = /- ([^\n(]+)\s*\(([^)]+)\)\s*\n\s*Path:\s*([^\n]+)/g;
  const files: FileInMessage[] = [];
  let fileMatch;

  while ((fileMatch = fileRegex.exec(uploadedFilesContent ?? "")) !== null) {
    files.push({
      filename: fileMatch[1].trim(),
      size: parseInt(fileMatch[2].trim(), 10) ?? 0,
      path: fileMatch[3].trim(),
    });
  }

  return files;
}
