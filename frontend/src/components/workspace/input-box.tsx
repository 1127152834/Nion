"use client";

import type { ChatStatus } from "ai";
import {
  CheckIcon,
  FileIcon,
  FolderIcon,
  FolderKanbanIcon,
  GraduationCapIcon,
  LightbulbIcon,
  PaperclipIcon,
  PlusIcon,
  SparklesIcon,
  RocketIcon,
  SquareTerminalIcon,
  WrenchIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";

import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { ConfettiButton } from "@/components/ui/confetti-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  buildNotebookDirectoryObjectMention,
  buildNotebookDirectoryMentionOptions,
  buildObjectImplicitMentions,
  type ObjectMention,
} from "@/core/automation/object-mentions";
import { useCLIConfig } from "@/core/cli";
import { getBackendBaseURL } from "@/core/config";
import { useI18n } from "@/core/i18n/hooks";
import { useMCPConfig } from "@/core/mcp/hooks";
import { useModels } from "@/core/models/hooks";
import { buildNotebookDirectoryOptions } from "@/core/notebook/directories";
import { useNotebookTree } from "@/core/notebook/hooks";
import { useSkills } from "@/core/skills/hooks";
import type { Skill } from "@/core/skills/type";
import type { AgentThreadContext } from "@/core/threads";
import type { PendingClarification } from "@/core/threads";
import { textOfMessage } from "@/core/threads/utils";
import { cn } from "@/lib/utils";

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "../ai-elements/model-selector";
import { Suggestion, Suggestions } from "../ai-elements/suggestion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { useThread } from "./messages/context";
import { ModeHoverGuide } from "./mode-hover-guide";
import { Tooltip } from "./tooltip";

type InputMode = "flash" | "thinking" | "pro" | "ultra";
type MentionTrigger = "@" | "/";

type MentionOption = {
  id: string;
  label: string;
  value: string;
  kind:
    | "file"
    | "directory"
    | "notebook-directory"
    | "skill"
    | "mcp"
    | "cli";
  description?: string;
};

type MentionState = {
  trigger: MentionTrigger;
  query: string;
  start: number;
  end: number;
};

type SelectedContextTag = {
  value: string;
  kind: "file" | "directory";
};

type MentionGroup = {
  id: string;
  label: string;
  options: MentionOption[];
};

type RecentMentionsState = {
  "@": string[];
  "/": string[];
};

const RECENT_MENTION_LIMIT = 5;
const MAX_INLINE_MENTION_SUMMARY_ITEMS = 3;

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

function basename(path: string): string {
  const normalized = normalizePath(path).replace(/\/$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function buildPathMentionOptions(paths: string[]): MentionOption[] {
  const fileSet = new Set<string>();
  const directorySet = new Set<string>();

  for (const rawPath of paths) {
    const normalized = normalizePath(rawPath).trim();
    if (!normalized) {
      continue;
    }

    const isDirectoryInput = normalized.endsWith("/");
    const pathWithoutTrailingSlash = normalized.replace(/\/+$/, "");
    if (!pathWithoutTrailingSlash) {
      continue;
    }

    if (isDirectoryInput) {
      directorySet.add(pathWithoutTrailingSlash);
    } else {
      fileSet.add(pathWithoutTrailingSlash);
    }

    const parts = pathWithoutTrailingSlash.split("/").filter(Boolean);
    const rootPrefix = pathWithoutTrailingSlash.startsWith("/") ? "/" : "";
    let current = "";
    for (let index = 0; index < parts.length - 1; index += 1) {
      current = `${current}/${parts[index]}`;
      directorySet.add(`${rootPrefix}${current}`.replace(/\/{2,}/g, "/"));
    }
  }

  const directoryOptions: MentionOption[] = [...directorySet]
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({
      id: `dir:${path}`,
      label: basename(path),
      value: path,
      kind: "directory" as const,
      description: path,
    }));
  const fileOptions: MentionOption[] = [...fileSet]
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({
      id: `file:${path}`,
      label: basename(path),
      value: path,
      kind: "file" as const,
      description: path,
    }));
  return [...directoryOptions, ...fileOptions];
}

function rankMentionOption(option: MentionOption, normalizedQuery: string): number {
  if (!normalizedQuery) {
    return 0;
  }
  const label = option.label.toLowerCase();
  const value = option.value.toLowerCase();
  const description = option.description?.toLowerCase() ?? "";

  if (label === normalizedQuery || value === normalizedQuery) return 5;
  if (label.startsWith(normalizedQuery) || value.startsWith(normalizedQuery)) {
    return 4;
  }
  if (label.includes(normalizedQuery) || value.includes(normalizedQuery)) {
    return 3;
  }
  if (description.includes(normalizedQuery)) {
    return 2;
  }
  return 0;
}

function resolveMentionState(value: string, caret: number): MentionState | null {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  if (safeCaret <= 0) {
    return null;
  }

  let triggerIndex = -1;
  let trigger: MentionTrigger | null = null;
  for (let index = safeCaret - 1; index >= 0; index -= 1) {
    const char = value.charAt(index);
    if (char === " " || char === "\n") {
      break;
    }
    if (char === "@" || char === "/") {
      triggerIndex = index;
      trigger = char as MentionTrigger;
      break;
    }
  }

  if (triggerIndex === -1 || !trigger) {
    return null;
  }

  return {
    trigger,
    query: value.slice(triggerIndex + 1, safeCaret),
    start: triggerIndex,
    end: safeCaret,
  };
}

function parseMentions(
  text: string,
  selectedSkills: string[],
  selectedContexts: SelectedContextTag[],
  selectedMcpTools: string[],
  selectedObjectMentions: ObjectMention[],
): Array<{
  type: "skill" | "context" | "tool" | "object";
  value: string;
  start: number;
  end: number;
}> {
  const mentions: Array<{
    type: "skill" | "context" | "tool" | "object";
    value: string;
    start: number;
    end: number;
  }> = [];

  const skillRegex = /(^|\s)(\/[a-zA-Z0-9_-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = skillRegex.exec(text)) !== null) {
    const skillText = match[2];
    const leadingWhitespace = match[1] ?? "";
    const fullMatch = match[0] ?? "";
    if (!skillText) {
      continue;
    }
    const skillName = skillText.slice(1);
    if (selectedSkills.includes(skillName)) {
      mentions.push({
        type: "skill",
        value: skillName,
        start: match.index + leadingWhitespace.length,
        end: match.index + fullMatch.length,
      });
    }
  }

  const atRegex = /(^|\s)(@[^\s]+)/g;
  while ((match = atRegex.exec(text)) !== null) {
    const atText = match[2];
    const leadingWhitespace = match[1] ?? "";
    const fullMatch = match[0] ?? "";
    if (!atText) {
      continue;
    }
    const value = atText.slice(1);
    if (selectedMcpTools.includes(value)) {
      mentions.push({
        type: "tool",
        value,
        start: match.index + leadingWhitespace.length,
        end: match.index + fullMatch.length,
      });
    } else if (
      selectedObjectMentions.some((mention) => mention.value === value)
    ) {
      mentions.push({
        type: "object",
        value,
        start: match.index + leadingWhitespace.length,
        end: match.index + fullMatch.length,
      });
    } else if (selectedContexts.some((context) => context.value === value)) {
      mentions.push({
        type: "context",
        value,
        start: match.index + leadingWhitespace.length,
        end: match.index + fullMatch.length,
      });
    }
  }

  return mentions;
}

function MentionHighlightOverlay({
  text,
  mentions,
}: {
  text: string;
  mentions: Array<{
    type: "skill" | "context" | "tool" | "object";
    value: string;
    start: number;
    end: number;
  }>;
}) {
  const segments: Array<{ text: string; isMention: boolean; type?: string }> = [];
  let lastIndex = 0;
  const sortedMentions = [...mentions].sort((a, b) => a.start - b.start);

  for (const mention of sortedMentions) {
    if (mention.start > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, mention.start),
        isMention: false,
      });
    }
    segments.push({
      text: text.slice(mention.start, mention.end),
      isMention: true,
      type: mention.type,
    });
    lastIndex = mention.end;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isMention: false,
    });
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-3 text-sm leading-relaxed">
      {segments.map((segment, index) => {
        if (segment.isMention) {
          const colorClass =
            segment.type === "skill"
              ? "bg-purple-500/30 dark:bg-purple-500/20"
              : segment.type === "object"
                ? "bg-amber-500/30 dark:bg-amber-500/20"
              : segment.type === "context"
                ? "bg-blue-500/30 dark:bg-blue-500/20"
                : "bg-green-500/30 dark:bg-green-500/20";
          return (
            <span
              key={index}
              className={cn("rounded px-0.5 font-semibold text-transparent", colorClass)}
            >
              {segment.text}
            </span>
          );
        }
        return (
          <span key={index} className="text-transparent">
            {segment.text}
          </span>
        );
      })}
    </div>
  );
}

function buildSubmissionPayload(
  text: string,
  selectedSkills: string[],
  selectedContexts: SelectedContextTag[],
  selectedMcpTools: string[],
  selectedCliTools: string[],
  selectedObjectMentions: ObjectMention[],
) {
  const trimmed = text.trim();
  const implicitMentions: NonNullable<PromptInputMessage["implicitMentions"]> = [];
  const seenMentions = new Set<string>();

  const hasInlineMention = (mention: string) =>
    new RegExp(`(^|\\s)${mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`).test(trimmed);

  const appendImplicitMention = (
    kind: "context" | "skill" | "mcp" | "cli",
    value: string,
    mention: string,
  ) => {
    if (hasInlineMention(mention) || seenMentions.has(mention)) {
      return;
    }
    seenMentions.add(mention);
    implicitMentions.push({ kind, value, mention });
  };

  for (const context of selectedContexts) {
    appendImplicitMention("context", context.value, `@${context.value}`);
  }
  for (const skill of selectedSkills) {
    appendImplicitMention("skill", skill, `/${skill}`);
  }
  for (const tool of selectedMcpTools) {
    appendImplicitMention("mcp", tool, `@${tool}`);
  }
  for (const tool of selectedCliTools) {
    appendImplicitMention("cli", tool, `#${tool}`);
  }
  implicitMentions.push(
    ...buildObjectImplicitMentions({
      text: trimmed,
      mentions: selectedObjectMentions,
    }).filter((mention) => {
      if (seenMentions.has(mention.mention)) {
        return false;
      }
      seenMentions.add(mention.mention);
      return true;
    }),
  );

  const mentionLine = implicitMentions.map((item) => item.mention).join(" ");
  return {
    text:
      implicitMentions.length > 0 && mentionLine
        ? `${trimmed}\n\n${mentionLine}`
        : trimmed,
    implicitMentions,
  };
}

function getResolvedMode(
  mode: InputMode | undefined,
  supportsThinking: boolean,
): InputMode {
  if (!supportsThinking && mode !== "flash") {
    return "flash";
  }
  if (mode) {
    return mode;
  }
  return supportsThinking ? "pro" : "flash";
}

export function InputBox({
  className,
  disabled,
  autoFocus,
  status = "ready",
  context,
  extraHeader,
  pendingClarification,
  isNewThread,
  threadId,
  initialValue,
  workspacePaths = [],
  onContextChange,
  onSubmit,
  onStop,
  ...props
}: Omit<ComponentProps<typeof PromptInput>, "onSubmit"> & {
  assistantId?: string | null;
  status?: ChatStatus;
  disabled?: boolean;
  context: Omit<
    AgentThreadContext,
    "thread_id" | "is_plan_mode" | "thinking_enabled" | "subagent_enabled"
  > & {
    mode: "flash" | "thinking" | "pro" | "ultra" | undefined;
    reasoning_effort?: "minimal" | "low" | "medium" | "high";
  };
  extraHeader?: React.ReactNode;
  pendingClarification?: PendingClarification | null;
  isNewThread?: boolean;
  threadId: string;
  initialValue?: string;
  workspacePaths?: string[];
  onContextChange?: (
    context: Omit<
      AgentThreadContext,
      "thread_id" | "is_plan_mode" | "thinking_enabled" | "subagent_enabled"
    > & {
      mode: "flash" | "thinking" | "pro" | "ultra" | undefined;
      reasoning_effort?: "minimal" | "low" | "medium" | "high";
    },
  ) => void;
  onSubmit?: (message: PromptInputMessage) => void;
  onStop?: () => void;
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const { models } = useModels();
  const { skills } = useSkills();
  const { config: mcpConfig } = useMCPConfig();
  const { config: cliConfig } = useCLIConfig();
  const { tree: notebookTree } = useNotebookTree();
  const { thread, isMock } = useThread();
  const projectInfo = thread.values.project;
  const { textInput } = usePromptInputController();
  const promptRootRef = useRef<HTMLDivElement | null>(null);
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [selectedContexts, setSelectedContexts] = useState<SelectedContextTag[]>([]);
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCliTools, setSelectedCliTools] = useState<string[]>([]);
  const [selectedObjectMentions, setSelectedObjectMentions] = useState<ObjectMention[]>([]);
  const [recentMentions, setRecentMentions] = useState<RecentMentionsState>({
    "@": [],
    "/": [],
  });
  const [contextSelectorOpen, setContextSelectorOpen] = useState(false);
  const [contextSelectorQuery, setContextSelectorQuery] = useState("");
  const [skillSelectorOpen, setSkillSelectorOpen] = useState(false);
  const [skillSelectorQuery, setSkillSelectorQuery] = useState("");
  const [mcpSelectorOpen, setMcpSelectorOpen] = useState(false);
  const [mcpSelectorQuery, setMcpSelectorQuery] = useState("");
  const [cliSelectorOpen, setCliSelectorOpen] = useState(false);
  const [cliSelectorQuery, setCliSelectorQuery] = useState("");

  const [followups, setFollowups] = useState<string[]>([]);
  const [followupsHidden, setFollowupsHidden] = useState(false);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  const lastGeneratedForAiIdRef = useRef<string | null>(null);
  const wasStreamingRef = useRef(false);
  const initialValueAppliedRef = useRef<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!initialValue || initialValueAppliedRef.current === initialValue) {
      return;
    }
    if ((textInput.value ?? "").trim().length > 0) {
      return;
    }
    textInput.setInput(initialValue);
    initialValueAppliedRef.current = initialValue;
  }, [initialValue, textInput]);

  useEffect(() => {
    if (models.length === 0) {
      return;
    }
    const currentModel = models.find((m) => m.name === context.model_name);
    const fallbackModel = currentModel ?? models[0]!;
    const supportsThinking = fallbackModel.supports_thinking ?? false;
    const nextModelName = fallbackModel.name;
    const nextMode = getResolvedMode(context.mode, supportsThinking);
    const shouldFollowDefault = !context.model_name_manually_selected;

    if (currentModel && !shouldFollowDefault && context.mode === nextMode) {
      return;
    }

    if (context.model_name === nextModelName && context.mode === nextMode) {
      return;
    }

    onContextChange?.({
      ...context,
      model_name: nextModelName,
      model_name_manually_selected: currentModel ? context.model_name_manually_selected : false,
      mode: nextMode,
    });
  }, [context, models, onContextChange]);

  const selectedModel = useMemo(() => {
    if (models.length === 0) {
      return undefined;
    }
    return models.find((m) => m.name === context.model_name) ?? models[0];
  }, [context.model_name, models]);

  const supportThinking = useMemo(
    () => selectedModel?.supports_thinking ?? false,
    [selectedModel],
  );

  const supportReasoningEffort = useMemo(
    () => selectedModel?.supports_reasoning_effort ?? false,
    [selectedModel],
  );

  const fileMentionOptions = useMemo<MentionOption[]>(
    () => buildPathMentionOptions(workspacePaths),
    [workspacePaths],
  );

  const notebookDirectoryMentionOptions = useMemo<MentionOption[]>(
    () =>
      buildNotebookDirectoryMentionOptions(
        buildNotebookDirectoryOptions({
          entries: notebookTree.directories,
          includeInbox: true,
        }),
      ),
    [notebookTree.directories],
  );

  const skillMentionOptions = useMemo<MentionOption[]>(
    () =>
      skills.map((skill: Skill) => ({
        id: `skill:${skill.name}`,
        label: skill.name,
        value: skill.name,
        kind: "skill",
        description: skill.description,
      })),
    [skills],
  );

  const mcpMentionOptions = useMemo<MentionOption[]>(
    () =>
      Object.entries(mcpConfig?.mcp_servers ?? {})
        .filter(([, server]) => server.enabled)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([serverName, server]) => ({
          id: `mcp:${serverName}`,
          label: serverName,
          value: serverName,
          kind: "mcp" as const,
          description: server.description?.trim() ?? "MCP tool",
        })),
    [mcpConfig?.mcp_servers],
  );

  const cliMentionOptions = useMemo<MentionOption[]>(
    () =>
      Object.entries(cliConfig?.clis ?? {})
        .filter(([, tool]) => tool.enabled)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([toolId, tool]) => ({
          id: `cli:${toolId}`,
          label: tool.displayName?.trim() ?? toolId,
          value: toolId,
          kind: "cli" as const,
          description: tool.version
            ? `v${tool.version} · ${tool.description}`
            : tool.description,
        })),
    [cliConfig?.clis],
  );


  const filteredMentionOptions = useMemo(() => {
    if (!mentionState) {
      return [];
    }
    const source =
      mentionState.trigger === "@"
        ? [
            ...notebookDirectoryMentionOptions,
            ...fileMentionOptions,
          ]
        : skillMentionOptions;
    const normalizedQuery = mentionState.query.trim().toLowerCase();
    return source
      .map((option) => ({
        option,
        score: rankMentionOption(option, normalizedQuery),
      }))
      .filter((item) => item.score > 0 || !normalizedQuery)
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.option.value.localeCompare(b.option.value);
      })
      .slice(0, 80)
      .map((item) => item.option);
  }, [
    fileMentionOptions,
    mentionState,
    notebookDirectoryMentionOptions,
    skillMentionOptions,
  ]);

  const mentionGroups = useMemo<MentionGroup[]>(() => {
    if (!mentionState) {
      return [];
    }
    const recents = recentMentions[mentionState.trigger] ?? [];
    const byValue = new Map(
      filteredMentionOptions.map((option) => [option.value, option]),
    );
    const recentOptions = recents
      .map((value) => byValue.get(value))
      .filter((item): item is MentionOption => Boolean(item));
    const recentValues = new Set(recentOptions.map((item) => item.value));
    const remaining = filteredMentionOptions.filter(
      (item) => !recentValues.has(item.value),
    );

    const groups: MentionGroup[] = [];
    if (recentOptions.length > 0) {
      groups.push({
        id: "recent",
        label: "Recent",
        options: recentOptions.slice(0, RECENT_MENTION_LIMIT),
      });
    }
    if (mentionState.trigger === "/") {
      if (remaining.length > 0) {
        groups.push({
          id: "skills",
          label: "Skills",
          options: remaining.slice(0, 40),
        });
      }
      return groups;
    }
    const notebookDirectories = remaining.filter(
      (item) => item.kind === "notebook-directory",
    );
    const directories = remaining.filter((item) => item.kind === "directory");
    const files = remaining.filter((item) => item.kind === "file");
    if (notebookDirectories.length > 0) {
      groups.push({
        id: "notebook-directories",
        label: "Notebook",
        options: notebookDirectories.slice(0, 20),
      });
    }
    if (directories.length > 0) {
      groups.push({
        id: "directories",
        label: "Directories",
        options: directories.slice(0, 20),
      });
    }
    if (files.length > 0) {
      groups.push({
        id: "files",
        label: "Files",
        options: files.slice(0, 40),
      });
    }
    return groups;
  }, [filteredMentionOptions, mentionState, recentMentions]);

  const filteredContextSelectorOptions = useMemo(() => {
    const normalizedQuery = contextSelectorQuery.trim().toLowerCase();
    return fileMentionOptions
      .map((option) => ({
        option,
        score: rankMentionOption(option, normalizedQuery),
      }))
      .filter((item) => item.score > 0 || !normalizedQuery)
      .sort((a, b) => (a.score === b.score ? a.option.value.localeCompare(b.option.value) : b.score - a.score))
      .slice(0, 120)
      .map((item) => item.option);
  }, [contextSelectorQuery, fileMentionOptions]);

  const filteredSkillSelectorOptions = useMemo(() => {
    const normalizedQuery = skillSelectorQuery.trim().toLowerCase();
    return skillMentionOptions
      .map((option) => ({
        option,
        score: rankMentionOption(option, normalizedQuery),
      }))
      .filter((item) => item.score > 0 || !normalizedQuery)
      .sort((a, b) => (a.score === b.score ? a.option.value.localeCompare(b.option.value) : b.score - a.score))
      .slice(0, 120)
      .map((item) => item.option);
  }, [skillMentionOptions, skillSelectorQuery]);

  const filteredMcpSelectorOptions = useMemo(() => {
    const normalizedQuery = mcpSelectorQuery.trim().toLowerCase();
    return mcpMentionOptions
      .map((option) => ({
        option,
        score: rankMentionOption(option, normalizedQuery),
      }))
      .filter((item) => item.score > 0 || !normalizedQuery)
      .sort((a, b) => (a.score === b.score ? a.option.value.localeCompare(b.option.value) : b.score - a.score))
      .slice(0, 120)
      .map((item) => item.option);
  }, [mcpMentionOptions, mcpSelectorQuery]);

  const filteredCliSelectorOptions = useMemo(() => {
    const normalizedQuery = cliSelectorQuery.trim().toLowerCase();
    return cliMentionOptions
      .map((option) => ({
        option,
        score: rankMentionOption(option, normalizedQuery),
      }))
      .filter((item) => item.score > 0 || !normalizedQuery)
      .sort((a, b) => (a.score === b.score ? a.option.value.localeCompare(b.option.value) : b.score - a.score))
      .slice(0, 120)
      .map((item) => item.option);
  }, [cliMentionOptions, cliSelectorQuery]);

  const handleModelSelect = useCallback(
    (model_name: string) => {
      const model = models.find((m) => m.name === model_name);
      if (!model) {
        return;
      }
      onContextChange?.({
        ...context,
        model_name,
        model_name_manually_selected: true,
        mode: getResolvedMode(context.mode, model.supports_thinking ?? false),
        reasoning_effort: context.reasoning_effort,
      });
      setModelDialogOpen(false);
    },
    [onContextChange, context, models],
  );

  const handleModeSelect = useCallback(
    (mode: InputMode) => {
      onContextChange?.({
        ...context,
        mode: getResolvedMode(mode, supportThinking),
        reasoning_effort: mode === "ultra" ? "high" : mode === "pro" ? "medium" : mode === "thinking" ? "low" : "minimal",
      });
    },
    [onContextChange, context, supportThinking],
  );

  const handleReasoningEffortSelect = useCallback(
    (effort: "minimal" | "low" | "medium" | "high") => {
      onContextChange?.({
        ...context,
        reasoning_effort: effort,
      });
    },
    [onContextChange, context],
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      if (status === "streaming") {
        onStop?.();
        return;
      }
      const submissionPayload = buildSubmissionPayload(
        message.text,
        selectedSkills,
        selectedContexts,
        selectedMcpTools,
        selectedCliTools,
        selectedObjectMentions,
      );
      if (!submissionPayload.text && message.files.length === 0) {
        return;
      }
      setFollowups([]);
      setFollowupsHidden(false);
      setFollowupsLoading(false);
      onSubmit?.({
        ...message,
        text: submissionPayload.text,
        implicitMentions:
          submissionPayload.implicitMentions.length > 0
            ? submissionPayload.implicitMentions
            : undefined,
        shortcutSelections: {
          contexts: selectedContexts,
          skills: selectedSkills,
          mcpTools: selectedMcpTools,
          cliTools: selectedCliTools,
        },
      });
    },
    [
      onSubmit,
      onStop,
      selectedCliTools,
      selectedContexts,
      selectedMcpTools,
      selectedObjectMentions,
      selectedSkills,
      status,
    ],
  );

  const requestFormSubmit = useCallback(() => {
    const form = promptRootRef.current?.querySelector("form");
    form?.requestSubmit();
  }, []);

  const focusMessageInput = useCallback(() => {
    return document.querySelector<HTMLTextAreaElement>("textarea[name='message']");
  }, []);

  const pushRecentMention = useCallback((trigger: MentionTrigger, value: string) => {
    setRecentMentions((prev) => {
      const list = prev[trigger];
      const filtered = list.filter((item) => item !== value);
      return {
        ...prev,
        [trigger]: [value, ...filtered].slice(0, RECENT_MENTION_LIMIT),
      };
    });
  }, []);

  const addSelectedContext = useCallback((value: string, kind: "file" | "directory") => {
    setSelectedContexts((prev) => {
      if (prev.some((item) => item.value === value)) {
        return prev;
      }
      return [...prev, { value, kind }];
    });
  }, []);

  const addSelectedSkill = useCallback((value: string) => {
    setSelectedSkills((prev) => (prev.includes(value) ? prev : [...prev, value]));
  }, []);

  const addSelectedObjectMention = useCallback((mention: ObjectMention) => {
    setSelectedObjectMentions((prev) => {
      if (
        prev.some(
          (item) =>
            item.objectKind === mention.objectKind && item.value === mention.value,
        )
      ) {
        return prev;
      }
      return [...prev, mention];
    });
  }, []);

  const applyMentionOption = useCallback(
    (option: MentionOption) => {
      if (!mentionState) {
        return;
      }
      const prefix = textInput.value.slice(0, mentionState.start);
      const suffix = textInput.value.slice(mentionState.end);
      const mentionText = `${mentionState.trigger}${option.value}`;
      const nextValue = `${prefix}${mentionText} ${suffix}`;
      const nextCaret = prefix.length + mentionText.length + 1;

      textInput.setInput(nextValue);
      pushRecentMention(mentionState.trigger, option.value);
      if (mentionState.trigger === "@") {
        if (option.kind === "notebook-directory") {
          addSelectedObjectMention(
            buildNotebookDirectoryObjectMention({
              value: option.value,
              label: option.label,
            }),
          );
        } else {
          addSelectedContext(
            option.value,
            option.kind === "directory" ? "directory" : "file",
          );
        }
      } else {
        addSelectedSkill(option.value);
      }
      setMentionState(null);
      setMentionActiveIndex(0);

      requestAnimationFrame(() => {
        const textarea = focusMessageInput();
        if (!textarea) {
          return;
        }
        textarea.focus();
        textarea.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [
      addSelectedObjectMention,
      addSelectedContext,
      addSelectedSkill,
      focusMessageInput,
      mentionState,
      pushRecentMention,
      textInput,
    ],
  );

  const insertMentionTrigger = useCallback(
    (trigger: MentionTrigger) => {
      const textarea = focusMessageInput();
      const value = textInput.value;
      const start = textarea?.selectionStart ?? value.length;
      const end = textarea?.selectionEnd ?? start;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
      const insertion = `${needsLeadingSpace ? " " : ""}${trigger}`;
      const nextValue = `${before}${insertion}${after}`;
      const nextCaret = before.length + insertion.length;

      textInput.setInput(nextValue);
      requestAnimationFrame(() => {
        const target = focusMessageInput();
        if (!target) {
          return;
        }
        target.focus();
        target.setSelectionRange(nextCaret, nextCaret);
        setMentionState({
          trigger,
          query: "",
          start: nextCaret - 1,
          end: nextCaret,
        });
        setMentionActiveIndex(0);
      });
    },
    [focusMessageInput, textInput],
  );

  const syncMentionState = useCallback((value: string, caret: number) => {
    const resolved = resolveMentionState(value, caret);
    if (!resolved) {
      setMentionState(null);
      return;
    }
    setMentionState(resolved);
  }, []);

  const handleMentionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const hasPrimaryModifier = event.metaKey || event.ctrlKey;
      if (hasPrimaryModifier && !event.altKey && event.key === "/") {
        event.preventDefault();
        insertMentionTrigger("/");
        return;
      }
      if (
        hasPrimaryModifier &&
        !event.altKey &&
        (event.key === "@" || (event.shiftKey && event.key === "2"))
      ) {
        event.preventDefault();
        insertMentionTrigger("@");
        return;
      }

      if (!mentionState) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setMentionState(null);
        return;
      }

      const flatOptions = mentionGroups.flatMap((group) => group.options);
      if (flatOptions.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionActiveIndex((current) => (current + 1) % flatOptions.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionActiveIndex((current) =>
          current === 0 ? flatOptions.length - 1 : current - 1,
        );
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const currentOption = flatOptions[mentionActiveIndex];
        if (currentOption) {
          applyMentionOption(currentOption);
        }
      }
    },
    [applyMentionOption, insertMentionTrigger, mentionActiveIndex, mentionGroups, mentionState],
  );

  const handleMentionSelectionSync = useCallback(
    (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      syncMentionState(target.value, target.selectionStart ?? target.value.length);
    },
    [syncMentionState],
  );

  const handleFollowupClick = useCallback(
    (suggestion: string) => {
      if (status === "streaming") {
        return;
      }
      const current = (textInput.value ?? "").trim();
      if (current) {
        setPendingSuggestion(suggestion);
        setConfirmOpen(true);
        return;
      }
      textInput.setInput(suggestion);
      setFollowupsHidden(true);
      setTimeout(() => requestFormSubmit(), 0);
    },
    [requestFormSubmit, status, textInput],
  );

  const confirmReplaceAndSend = useCallback(() => {
    if (!pendingSuggestion) {
      setConfirmOpen(false);
      return;
    }
    textInput.setInput(pendingSuggestion);
    setFollowupsHidden(true);
    setConfirmOpen(false);
    setPendingSuggestion(null);
    setTimeout(() => requestFormSubmit(), 0);
  }, [pendingSuggestion, requestFormSubmit, textInput]);

  const confirmAppendAndSend = useCallback(() => {
    if (!pendingSuggestion) {
      setConfirmOpen(false);
      return;
    }
    const current = (textInput.value ?? "").trim();
    const next = current ? `${current}\n${pendingSuggestion}` : pendingSuggestion;
    textInput.setInput(next);
    setFollowupsHidden(true);
    setConfirmOpen(false);
    setPendingSuggestion(null);
    setTimeout(() => requestFormSubmit(), 0);
  }, [pendingSuggestion, requestFormSubmit, textInput]);

  useEffect(() => {
    const streaming = status === "streaming";
    const wasStreaming = wasStreamingRef.current;
    wasStreamingRef.current = streaming;
    if (!wasStreaming || streaming) {
      return;
    }

    if (disabled || isMock) {
      return;
    }

    const lastAi = [...thread.messages].reverse().find((m) => m.type === "ai");
    const lastAiId = lastAi?.id ?? null;
    if (!lastAiId || lastAiId === lastGeneratedForAiIdRef.current) {
      return;
    }
    lastGeneratedForAiIdRef.current = lastAiId;

    const recent = thread.messages
      .filter((m) => m.type === "human" || m.type === "ai")
      .map((m) => {
        const role = m.type === "human" ? "user" : "assistant";
        const content = textOfMessage(m) ?? "";
        return { role, content };
      })
      .filter((m) => m.content.trim().length > 0)
      .slice(-6);

    if (recent.length === 0) {
      return;
    }

    const controller = new AbortController();
    setFollowupsHidden(false);
    setFollowupsLoading(true);
    setFollowups([]);

    fetch(`${getBackendBaseURL()}/api/threads/${threadId}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: recent,
        n: 3,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          return { suggestions: [] as string[] };
        }
        return (await res.json()) as { suggestions?: string[] };
      })
      .then((data) => {
        const suggestions = (data.suggestions ?? [])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
          .slice(0, 5);
        setFollowups(suggestions);
      })
      .catch(() => {
        setFollowups([]);
      })
      .finally(() => {
        setFollowupsLoading(false);
      });

    return () => controller.abort();
  }, [context.model_name, disabled, isMock, status, thread.messages, threadId]);

  const highlightedMentions = useMemo(
    () =>
      parseMentions(
        textInput.value,
        selectedSkills,
        selectedContexts,
        selectedMcpTools,
        selectedObjectMentions,
      ),
    [
      selectedContexts,
      selectedMcpTools,
      selectedObjectMentions,
      selectedSkills,
      textInput.value,
    ],
  );

  const hasAnySelectedMentions =
    selectedContexts.length > 0 ||
    selectedObjectMentions.length > 0 ||
    selectedSkills.length > 0 ||
    selectedMcpTools.length > 0 ||
    selectedCliTools.length > 0;

  return (
    <div ref={promptRootRef} className="relative">
      {pendingClarification ? (
        <div className="mb-2 flex items-center gap-2 rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm backdrop-blur-sm">
          <span className="text-muted-foreground shrink-0 font-medium">
            {t.inputBox.clarificationReplying}
          </span>
          <span className="text-foreground truncate">
            {pendingClarification.question}
          </span>
        </div>
      ) : null}
      <PromptInput
        className={cn(
          "bg-background/85 rounded-2xl backdrop-blur-sm transition-all duration-300 ease-out *:data-[slot='input-group']:rounded-2xl",
          className,
        )}
        disabled={disabled}
        globalDrop
        multiple
        onSubmit={handleSubmit}
        {...props}
      >
        {extraHeader && (
          <div className="absolute top-0 right-0 left-0 z-10">
            <div className="absolute right-0 bottom-0 left-0 flex items-center justify-center">
              {extraHeader}
            </div>
          </div>
        )}
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
        <PromptInputBody className="absolute top-0 right-0 left-0 z-[30]">
          <MentionHighlightOverlay
            text={textInput.value}
            mentions={highlightedMentions}
          />
          <PromptInputTextarea
            className={cn("relative z-10 size-full bg-transparent")}
            disabled={disabled}
            placeholder={
              pendingClarification
                ? t.inputBox.clarificationPlaceholder
                : t.inputBox.placeholder
            }
            autoFocus={autoFocus}
            onClick={handleMentionSelectionSync}
            onKeyDown={handleMentionKeyDown}
            onKeyUp={handleMentionSelectionSync}
            onSelect={handleMentionSelectionSync}
          />
        </PromptInputBody>
        {mentionState && (
          <div className="absolute right-0 bottom-full left-0 z-[140] pb-2">
            <div className="bg-background border-border mx-2 overflow-hidden rounded-lg border shadow-lg">
              {mentionGroups.length === 0 ? (
                <div className="text-muted-foreground px-3 py-2 text-xs">
                  No matches
                </div>
              ) : (
                <div className="max-h-60 overflow-auto p-1">
                  {(() => {
                    let optionIndex = -1;
                    return mentionGroups.map((group) => (
                      <div key={group.id} className="pt-1 first:pt-0">
                        <div className="text-muted-foreground px-2 pb-1 text-[10px]">
                          {group.label}
                        </div>
                        <div className="space-y-0.5">
                          {group.options.map((option) => {
                            optionIndex += 1;
                            const active = optionIndex === mentionActiveIndex;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                className={cn(
                                  "hover:bg-accent flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors",
                                  active && "bg-accent text-accent-foreground",
                                )}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applyMentionOption(option);
                                }}
                              >
                                <span className="text-muted-foreground mt-0.5">
                                  {option.kind === "directory" && (
                                    <FolderIcon className="size-3.5" />
                                  )}
                                  {option.kind === "notebook-directory" && (
                                    <FolderIcon className="size-3.5" />
                                  )}
                                  {option.kind === "file" && (
                                    <FileIcon className="size-3.5" />
                                  )}
                                  {option.kind === "skill" && (
                                    <SparklesIcon className="size-3.5" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-medium">
                                    {option.kind === "skill"
                                      ? `/${option.label}`
                                      : `@${option.label}`}
                                  </span>
                                  {option.description ? (
                                    <span className="text-muted-foreground block truncate text-[11px]">
                                      {option.description}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
        {hasAnySelectedMentions && (
          <div className="order-last w-full px-3 pb-1">
            <div className="flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto py-0.5">
              {selectedContexts.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground shrink-0 whitespace-nowrap text-[11px]">
                    Context
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedContexts
                      .slice(0, MAX_INLINE_MENTION_SUMMARY_ITEMS)
                      .map((context) => (
                        <button
                          key={context.value}
                          type="button"
                          className="bg-muted/50 hover:bg-muted text-foreground inline-flex max-w-32 items-center gap-1 rounded-md px-2 py-0.5 text-[11px]"
                          title={context.value}
                          onClick={() =>
                            setSelectedContexts((prev) =>
                              prev.filter((item) => item.value !== context.value),
                            )
                          }
                        >
                          {context.kind === "directory" ? (
                            <FolderIcon className="size-3 shrink-0" />
                          ) : (
                            <FileIcon className="size-3 shrink-0" />
                          )}
                          <span className="min-w-0 truncate">
                            {basename(context.value)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {selectedObjectMentions.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground shrink-0 whitespace-nowrap text-[11px]">
                    Notebook
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedObjectMentions
                      .slice(0, MAX_INLINE_MENTION_SUMMARY_ITEMS)
                      .map((mention) => (
                        <button
                          key={`${mention.objectKind}:${mention.value}`}
                          type="button"
                          className="bg-muted/50 hover:bg-muted text-foreground inline-flex max-w-32 items-center gap-1 rounded-md px-2 py-0.5 text-[11px]"
                          title={mention.value}
                          onClick={() =>
                            setSelectedObjectMentions((prev) =>
                              prev.filter(
                                (item) =>
                                  !(
                                    item.objectKind === mention.objectKind &&
                                    item.value === mention.value
                                  ),
                              ),
                            )
                          }
                        >
                          <FolderIcon className="size-3 shrink-0" />
                          <span className="min-w-0 truncate">
                            {mention.label}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {selectedSkills.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px]">
                    <SparklesIcon className="size-3" />
                    Skill
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedSkills
                      .slice(0, MAX_INLINE_MENTION_SUMMARY_ITEMS)
                      .map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          className="bg-muted/50 hover:bg-muted text-foreground inline-flex max-w-40 items-center gap-1 rounded-md px-2 py-0.5 text-[11px]"
                          onClick={() =>
                            setSelectedSkills((prev) =>
                              prev.filter((item) => item !== skill),
                            )
                          }
                        >
                          <span className="min-w-0 truncate">{skill}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {selectedMcpTools.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px]">
                    <WrenchIcon className="size-3" />
                    MCP
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedMcpTools
                      .slice(0, MAX_INLINE_MENTION_SUMMARY_ITEMS)
                      .map((tool) => (
                        <button
                          key={tool}
                          type="button"
                          className="bg-muted/50 hover:bg-muted text-foreground inline-flex max-w-32 items-center gap-1 rounded-md px-2 py-0.5 text-[11px]"
                          onClick={() =>
                            setSelectedMcpTools((prev) =>
                              prev.filter((item) => item !== tool),
                            )
                          }
                        >
                          <span className="min-w-0 truncate">{tool}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {selectedCliTools.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px]">
                    <SquareTerminalIcon className="size-3" />
                    CLI
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedCliTools
                      .slice(0, MAX_INLINE_MENTION_SUMMARY_ITEMS)
                      .map((tool) => (
                        <button
                          key={tool}
                          type="button"
                          className="bg-muted/50 hover:bg-muted text-foreground inline-flex max-w-32 items-center gap-1 rounded-md px-2 py-0.5 text-[11px]"
                          onClick={() =>
                            setSelectedCliTools((prev) =>
                              prev.filter((item) => item !== tool),
                            )
                          }
                        >
                          <span className="min-w-0 truncate">{tool}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <PromptInputFooter className="flex">
          <PromptInputTools>
          {/* TODO: Add more connectors here
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger className="px-2!" />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments
                label={t.inputBox.addAttachments}
              />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu> */}
          <AddAttachmentsButton className="px-2!" />
          <DropdownMenu
            open={contextSelectorOpen}
            onOpenChange={(open) => {
              setContextSelectorOpen(open);
              if (!open) setContextSelectorQuery("");
            }}
          >
            <DropdownMenuTrigger asChild>
              <PromptInputButton className="gap-1! px-2! text-xs" disabled={disabled}>
                <span>@</span>
                <span>Context</span>
                {selectedContexts.length > 0 && (
                  <span className="bg-foreground text-background inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold">
                    {selectedContexts.length}
                  </span>
                )}
              </PromptInputButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-96">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Context"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={contextSelectorQuery}
                  onChange={(e) => setContextSelectorQuery(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-auto">
                {filteredContextSelectorOptions.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    No matches
                  </div>
                ) : (
                  filteredContextSelectorOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      className="flex items-start gap-2 px-3 py-2"
                      onSelect={(event) => {
                        event.preventDefault();
                        setSelectedContexts((prev) =>
                          prev.some((item) => item.value === option.value)
                            ? prev.filter((item) => item.value !== option.value)
                            : [
                                ...prev,
                                {
                                  value: option.value,
                                  kind:
                                    option.kind === "directory"
                                      ? "directory"
                                      : "file",
                                },
                              ],
                        );
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContexts.some((item) => item.value === option.value)}
                        onChange={() => undefined}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-muted-foreground text-[11px]">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu
            open={skillSelectorOpen}
            onOpenChange={(open) => {
              setSkillSelectorOpen(open);
              if (!open) setSkillSelectorQuery("");
            }}
          >
            <DropdownMenuTrigger asChild>
              <PromptInputButton className="gap-1! px-2! text-xs" disabled={disabled}>
                <SparklesIcon className="size-3" />
                <span>Skill</span>
                {selectedSkills.length > 0 && (
                  <span className="bg-foreground text-background inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold">
                    {selectedSkills.length}
                  </span>
                )}
              </PromptInputButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Skill"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={skillSelectorQuery}
                  onChange={(e) => setSkillSelectorQuery(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-auto">
                {filteredSkillSelectorOptions.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    No matches
                  </div>
                ) : (
                  filteredSkillSelectorOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      className="flex items-start gap-2 px-3 py-2"
                      onSelect={(event) => {
                        event.preventDefault();
                        setSelectedSkills((prev) =>
                          prev.includes(option.value)
                            ? prev.filter((item) => item !== option.value)
                            : [...prev, option.value],
                        );
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(option.value)}
                        onChange={() => undefined}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-muted-foreground text-[11px]">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu
            open={mcpSelectorOpen}
            onOpenChange={(open) => {
              setMcpSelectorOpen(open);
              if (!open) setMcpSelectorQuery("");
            }}
          >
            <DropdownMenuTrigger asChild>
              <PromptInputButton className="gap-1! px-2! text-xs" disabled={disabled}>
                <WrenchIcon className="size-3" />
                <span>MCP</span>
                {selectedMcpTools.length > 0 && (
                  <span className="bg-foreground text-background inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold">
                    {selectedMcpTools.length}
                  </span>
                )}
              </PromptInputButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search MCP tools..."
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={mcpSelectorQuery}
                  onChange={(e) => setMcpSelectorQuery(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-auto">
                {filteredMcpSelectorOptions.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    No MCP tools available
                  </div>
                ) : (
                  filteredMcpSelectorOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      className="flex items-start gap-2 px-3 py-2"
                      onSelect={(event) => {
                        event.preventDefault();
                        setSelectedMcpTools((prev) =>
                          prev.includes(option.value)
                            ? prev.filter((item) => item !== option.value)
                            : [...prev, option.value],
                        );
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMcpTools.includes(option.value)}
                        onChange={() => undefined}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-muted-foreground text-[11px]">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu
            open={cliSelectorOpen}
            onOpenChange={(open) => {
              setCliSelectorOpen(open);
              if (!open) setCliSelectorQuery("");
            }}
          >
            <DropdownMenuTrigger asChild>
              <PromptInputButton className="gap-1! px-2! text-xs" disabled={disabled}>
                <SquareTerminalIcon className="size-3" />
                <span>CLI</span>
                {selectedCliTools.length > 0 && (
                  <span className="bg-foreground text-background inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold">
                    {selectedCliTools.length}
                  </span>
                )}
              </PromptInputButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search CLI tools..."
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={cliSelectorQuery}
                  onChange={(e) => setCliSelectorQuery(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-auto">
                {filteredCliSelectorOptions.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground">
                    <div>No CLI tools available</div>
                    <button
                      type="button"
                      className="mt-2 text-primary hover:underline"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("nion-open-settings", {
                            detail: { section: "cliTools" },
                          }),
                        );
                        setCliSelectorOpen(false);
                      }}
                    >
                      Go install CLI tools
                    </button>
                  </div>
                ) : (
                  filteredCliSelectorOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      className="flex items-start gap-2 px-3 py-2"
                      onSelect={(event) => {
                        event.preventDefault();
                        setSelectedCliTools((prev) =>
                          prev.includes(option.value)
                            ? prev.filter((item) => item !== option.value)
                            : [...prev, option.value],
                        );
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCliTools.includes(option.value)}
                        onChange={() => undefined}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-muted-foreground text-[11px]">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <div className="border-t px-3 py-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("nion-open-settings", {
                        detail: { section: "cliTools" },
                      }),
                    );
                    setCliSelectorOpen(false);
                  }}
                >
                  <SquareTerminalIcon className="size-3" />
                  Manage CLI tools
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <PromptInputActionMenu>
            <ModeHoverGuide
              mode={
                context.mode === "flash" ||
                  context.mode === "thinking" ||
                  context.mode === "pro" ||
                  context.mode === "ultra"
                  ? context.mode
                  : "flash"
              }
            >
              <PromptInputActionMenuTrigger className="gap-1! px-2!">
                <div>
                  {context.mode === "flash" && <ZapIcon className="size-3" />}
                  {context.mode === "thinking" && (
                    <LightbulbIcon className="size-3" />
                  )}
                  {context.mode === "pro" && (
                    <GraduationCapIcon className="size-3" />
                  )}
                  {context.mode === "ultra" && (
                    <RocketIcon className="size-3 text-[#dabb5e]" />
                  )}
                </div>
                <div
                  className={cn(
                    "text-xs font-normal",
                    context.mode === "ultra" ? "golden-text" : "",
                  )}
                >
                  {(context.mode === "flash" && t.inputBox.flashMode) ||
                    (context.mode === "thinking" && t.inputBox.reasoningMode) ||
                    (context.mode === "pro" && t.inputBox.proMode) ||
                    (context.mode === "ultra" && t.inputBox.ultraMode)}
                </div>
              </PromptInputActionMenuTrigger>
            </ModeHoverGuide>
            <PromptInputActionMenuContent className="w-80">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  {t.inputBox.mode}
                </DropdownMenuLabel>
                <PromptInputActionMenu>
                  <PromptInputActionMenuItem
                    className={cn(
                      context.mode === "flash"
                        ? "text-accent-foreground"
                        : "text-muted-foreground/65",
                    )}
                    onSelect={() => handleModeSelect("flash")}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1 font-bold">
                        <ZapIcon
                          className={cn(
                            "mr-2 size-4",
                            context.mode === "flash" &&
                            "text-accent-foreground",
                          )}
                        />
                        {t.inputBox.flashMode}
                      </div>
                      <div className="pl-7 text-xs">
                        {t.inputBox.flashModeDescription}
                      </div>
                    </div>
                    {context.mode === "flash" ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </PromptInputActionMenuItem>
                  {supportThinking && (
                    <PromptInputActionMenuItem
                      className={cn(
                        context.mode === "thinking"
                          ? "text-accent-foreground"
                          : "text-muted-foreground/65",
                      )}
                      onSelect={() => handleModeSelect("thinking")}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1 font-bold">
                          <LightbulbIcon
                            className={cn(
                              "mr-2 size-4",
                              context.mode === "thinking" &&
                              "text-accent-foreground",
                            )}
                          />
                          {t.inputBox.reasoningMode}
                        </div>
                        <div className="pl-7 text-xs">
                          {t.inputBox.reasoningModeDescription}
                        </div>
                      </div>
                      {context.mode === "thinking" ? (
                        <CheckIcon className="ml-auto size-4" />
                      ) : (
                        <div className="ml-auto size-4" />
                      )}
                    </PromptInputActionMenuItem>
                  )}
                  <PromptInputActionMenuItem
                    className={cn(
                      context.mode === "pro"
                        ? "text-accent-foreground"
                        : "text-muted-foreground/65",
                    )}
                    onSelect={() => handleModeSelect("pro")}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1 font-bold">
                        <GraduationCapIcon
                          className={cn(
                            "mr-2 size-4",
                            context.mode === "pro" && "text-accent-foreground",
                          )}
                        />
                        {t.inputBox.proMode}
                      </div>
                      <div className="pl-7 text-xs">
                        {t.inputBox.proModeDescription}
                      </div>
                    </div>
                    {context.mode === "pro" ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </PromptInputActionMenuItem>
                  <PromptInputActionMenuItem
                    className={cn(
                      context.mode === "ultra"
                        ? "text-accent-foreground"
                        : "text-muted-foreground/65",
                    )}
                    onSelect={() => handleModeSelect("ultra")}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1 font-bold">
                        <RocketIcon
                          className={cn(
                            "mr-2 size-4",
                            context.mode === "ultra" && "text-[#dabb5e]",
                          )}
                        />
                        <div
                          className={cn(
                            context.mode === "ultra" && "golden-text",
                          )}
                        >
                          {t.inputBox.ultraMode}
                        </div>
                      </div>
                      <div className="pl-7 text-xs">
                        {t.inputBox.ultraModeDescription}
                      </div>
                    </div>
                    {context.mode === "ultra" ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </PromptInputActionMenuItem>
                </PromptInputActionMenu>
              </DropdownMenuGroup>
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          {supportReasoningEffort && context.mode !== "flash" && (
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger className="gap-1! px-2!">
                <div className="text-xs font-normal">
                  {t.inputBox.reasoningEffort}:
                  {context.reasoning_effort === "minimal" && " " + t.inputBox.reasoningEffortMinimal}
                  {context.reasoning_effort === "low" && " " + t.inputBox.reasoningEffortLow}
                  {context.reasoning_effort === "medium" && " " + t.inputBox.reasoningEffortMedium}
                  {context.reasoning_effort === "high" && " " + t.inputBox.reasoningEffortHigh}
                </div>
              </PromptInputActionMenuTrigger>
              <PromptInputActionMenuContent className="w-70">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    {t.inputBox.reasoningEffort}
                  </DropdownMenuLabel>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuItem
                      className={cn(
                        context.reasoning_effort === "minimal"
                          ? "text-accent-foreground"
                          : "text-muted-foreground/65",
                      )}
                      onSelect={() => handleReasoningEffortSelect("minimal")}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1 font-bold">
                          {t.inputBox.reasoningEffortMinimal}
                        </div>
                        <div className="pl-2 text-xs">
                          {t.inputBox.reasoningEffortMinimalDescription}
                        </div>
                      </div>
                      {context.reasoning_effort === "minimal" ? (
                        <CheckIcon className="ml-auto size-4" />
                      ) : (
                        <div className="ml-auto size-4" />
                      )}
                    </PromptInputActionMenuItem>
                    <PromptInputActionMenuItem
                      className={cn(
                        context.reasoning_effort === "low"
                          ? "text-accent-foreground"
                          : "text-muted-foreground/65",
                      )}
                      onSelect={() => handleReasoningEffortSelect("low")}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1 font-bold">
                          {t.inputBox.reasoningEffortLow}
                        </div>
                        <div className="pl-2 text-xs">
                          {t.inputBox.reasoningEffortLowDescription}
                        </div>
                      </div>
                      {context.reasoning_effort === "low" ? (
                        <CheckIcon className="ml-auto size-4" />
                      ) : (
                        <div className="ml-auto size-4" />
                      )}
                    </PromptInputActionMenuItem>
                    <PromptInputActionMenuItem
                      className={cn(
                        context.reasoning_effort === "medium" || !context.reasoning_effort
                          ? "text-accent-foreground"
                          : "text-muted-foreground/65",
                      )}
                      onSelect={() => handleReasoningEffortSelect("medium")}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1 font-bold">
                          {t.inputBox.reasoningEffortMedium}
                        </div>
                        <div className="pl-2 text-xs">
                          {t.inputBox.reasoningEffortMediumDescription}
                        </div>
                      </div>
                      {context.reasoning_effort === "medium" || !context.reasoning_effort ? (
                        <CheckIcon className="ml-auto size-4" />
                      ) : (
                        <div className="ml-auto size-4" />
                      )}
                    </PromptInputActionMenuItem>
                    <PromptInputActionMenuItem
                      className={cn(
                        context.reasoning_effort === "high"
                          ? "text-accent-foreground"
                          : "text-muted-foreground/65",
                      )}
                      onSelect={() => handleReasoningEffortSelect("high")}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1 font-bold">
                          {t.inputBox.reasoningEffortHigh}
                        </div>
                        <div className="pl-2 text-xs">
                          {t.inputBox.reasoningEffortHighDescription}
                        </div>
                      </div>
                      {context.reasoning_effort === "high" ? (
                        <CheckIcon className="ml-auto size-4" />
                      ) : (
                        <div className="ml-auto size-4" />
                      )}
                    </PromptInputActionMenuItem>
                  </PromptInputActionMenu>
                </DropdownMenuGroup>
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          )}
        </PromptInputTools>
        <PromptInputTools>
          <ModelSelector
            open={modelDialogOpen}
            onOpenChange={setModelDialogOpen}
          >
            <ModelSelectorTrigger asChild>
              <PromptInputButton className="min-w-0 rounded-full px-3">
                <div className="flex min-w-0 items-center text-left">
                  <ModelSelectorName className="text-[13px] font-medium text-foreground/78">
                    {selectedModel?.display_name}
                  </ModelSelectorName>
                </div>
              </PromptInputButton>
            </ModelSelectorTrigger>
            <ModelSelectorContent className="max-w-sm rounded-2xl border border-border/50 shadow-2xl">
              <ModelSelectorInput placeholder={t.inputBox.searchModels} />
              <ModelSelectorList>
                {models.map((m) => (
                  <ModelSelectorItem
                    key={m.name}
                    value={m.name}
                    className="rounded-none px-3 py-3"
                    onSelect={() => handleModelSelect(m.name)}
                  >
                    <div className="flex min-w-0 flex-1 items-center">
                      <ModelSelectorName>{m.display_name}</ModelSelectorName>
                    </div>
                    {m.name === context.model_name ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
          <PromptInputSubmit
            className="rounded-full"
            disabled={disabled}
            variant="outline"
            status={status}
          />
        </PromptInputTools>
      </PromptInputFooter>
      {isNewThread && searchParams.get("mode") !== "skill" && (
        <div className="absolute right-0 -bottom-20 left-0 z-0 flex items-center justify-center">
          <SuggestionList />
        </div>
      )}
      {!isNewThread && (
        <div className="bg-background absolute right-0 -bottom-[17px] left-0 z-0 h-4"></div>
      )}
      </PromptInput>

      {!disabled &&
        !isNewThread &&
        !followupsHidden &&
        (followupsLoading || followups.length > 0) && (
          <div className="absolute right-0 -top-20 left-0 z-20 flex items-center justify-center">
            <div className="flex items-center gap-2">
              {followupsLoading ? (
                <div className="text-muted-foreground bg-background/80 rounded-full border px-4 py-2 text-xs backdrop-blur-sm">
                  {t.inputBox.followupLoading}
                </div>
              ) : (
                <Suggestions className="min-h-16 w-fit items-start">
                  {followups.map((s) => (
                    <Suggestion
                      key={s}
                      suggestion={s}
                      onClick={() => handleFollowupClick(s)}
                    />
                  ))}
                  <Button
                    aria-label={t.common.close}
                    className="text-muted-foreground cursor-pointer rounded-full px-3 text-xs font-normal"
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setFollowupsHidden(true)}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </Suggestions>
              )}
            </div>
          </div>
        )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.inputBox.followupConfirmTitle}</DialogTitle>
            <DialogDescription>
              {t.inputBox.followupConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="secondary" onClick={confirmAppendAndSend}>
              {t.inputBox.followupConfirmAppend}
            </Button>
            <Button onClick={confirmReplaceAndSend}>
              {t.inputBox.followupConfirmReplace}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SuggestionList() {
  const { t } = useI18n();
  const { textInput } = usePromptInputController();
  const handleSuggestionClick = useCallback(
    (prompt: string | undefined) => {
      if (!prompt) return;
      textInput.setInput(prompt);
      setTimeout(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>(
          "textarea[name='message']",
        );
        if (textarea) {
          const selStart = prompt.indexOf("[");
          const selEnd = prompt.indexOf("]");
          if (selStart !== -1 && selEnd !== -1) {
            textarea.setSelectionRange(selStart, selEnd + 1);
            textarea.focus();
          }
        }
      }, 500);
    },
    [textInput],
  );
  return (
    <Suggestions className="min-h-16 w-fit items-start">
      <ConfettiButton
        className="text-muted-foreground cursor-pointer rounded-full px-4 text-xs font-normal"
        variant="outline"
        size="sm"
        onClick={() => handleSuggestionClick(t.inputBox.surpriseMePrompt)}
      >
        <SparklesIcon className="size-4" /> {t.inputBox.surpriseMe}
      </ConfettiButton>
      {t.inputBox.suggestions.map((suggestion) => (
        <Suggestion
          key={suggestion.suggestion}
          icon={suggestion.icon}
          suggestion={suggestion.suggestion}
          onClick={() => handleSuggestionClick(suggestion.prompt)}
        />
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Suggestion icon={PlusIcon} suggestion={t.common.create} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            {t.inputBox.suggestionsCreate.map((suggestion, index) =>
              "type" in suggestion && suggestion.type === "separator" ? (
                <DropdownMenuSeparator key={index} />
              ) : (
                !("type" in suggestion) && (
                  <DropdownMenuItem
                    key={suggestion.suggestion}
                    onClick={async () => {
                      handleSuggestionClick(suggestion.prompt);
                    }}
                  >
                    {suggestion.icon && <suggestion.icon className="size-4" />}
                    {suggestion.suggestion}
                  </DropdownMenuItem>
                )
              ),
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Suggestions>
  );
}

function AddAttachmentsButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const attachments = usePromptInputAttachments();
  return (
    <Tooltip content={t.inputBox.addAttachments}>
      <PromptInputButton
        className={cn("px-2!", className)}
        onClick={() => attachments.openFileDialog()}
      >
        <PaperclipIcon className="size-3" />
      </PromptInputButton>
    </Tooltip>
  );
}
