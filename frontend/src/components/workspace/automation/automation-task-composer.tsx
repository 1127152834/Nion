"use client";

import {
  FileIcon,
  FolderIcon,
  SparklesIcon,
  SquareTerminalIcon,
  WrenchIcon,
} from "lucide-react";
import { useMemo, useRef, useState, type SyntheticEvent } from "react";

import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildAutomationDraftRequest } from "@/core/automation/draft-builder";
import {
  buildNotebookDirectoryMentionOptions,
  buildNotebookDirectoryObjectMention,
  buildObjectImplicitMentions,
  type ObjectMention,
} from "@/core/automation/object-mentions";
import type { AutomationScheduleDefinition } from "@/core/automation/schedule-definition";
import type { AutomationJobCreateInput } from "@/core/automation/types";
import { useCLIConfig } from "@/core/cli";
import { useMCPConfig } from "@/core/mcp/hooks";
import { buildNotebookDirectoryOptions } from "@/core/notebook/directories";
import { useNotebookTree } from "@/core/notebook/hooks";
import { useSkills } from "@/core/skills/hooks";
import { cn } from "@/lib/utils";

import { ScheduleBuilder } from "./schedule-builder";
import type { AutomationComposerImplicitMention } from "./automation-types";

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

type SelectedContextTag = {
  value: string;
  kind: "file" | "directory";
};

type MentionState = {
  trigger: MentionTrigger;
  query: string;
  start: number;
  end: number;
};

type MentionGroup = {
  id: string;
  label: string;
  options: MentionOption[];
};

type AutomationTaskComposerProps = {
  isPending: boolean;
  onSubmit: (input: AutomationJobCreateInput) => Promise<unknown>;
};

export function AutomationTaskComposer({
  isPending,
  onSubmit,
}: AutomationTaskComposerProps) {
  const controller = usePromptInputController();
  const { skills } = useSkills();
  const { tree } = useNotebookTree();
  const { config: mcpConfig } = useMCPConfig();
  const { config: cliConfig } = useCLIConfig();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  const [schedule, setSchedule] = useState<AutomationScheduleDefinition>({
    preset: "daily",
    timezone,
    timeOfDay: "09:00",
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedContexts, setSelectedContexts] = useState<SelectedContextTag[]>([]);
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [selectedCliTools, setSelectedCliTools] = useState<string[]>([]);
  const [selectedObjectMentions, setSelectedObjectMentions] = useState<
    ObjectMention[]
  >([]);
  const [status, setStatus] = useState<"ready" | "submitted">("ready");
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);

  const notebookOptions = useMemo(
    () =>
      buildNotebookDirectoryMentionOptions(
        buildNotebookDirectoryOptions({
          entries: tree.directories,
          includeInbox: true,
          inboxLabel: "笔记",
          rootLabel: "根目录",
        }),
      ),
    [tree.directories],
  );
  const skillOptions = useMemo(
    () =>
      skills.map((skill) => ({
        id: `skill:${skill.id}`,
        label: skill.name || skill.id,
        value: skill.id,
        kind: "skill" as const,
        description: skill.description,
      })),
    [skills],
  );
  const mcpOptions = useMemo(
    () =>
      Object.entries(mcpConfig?.mcp_servers ?? {})
        .filter(([, config]) => config.enabled)
        .map(([serverName, config]) => ({
          id: `mcp:${serverName}`,
          label: serverName,
          value: serverName,
          kind: "mcp" as const,
          description: config.description,
        })),
    [mcpConfig?.mcp_servers],
  );
  const cliOptions = useMemo(
    () =>
      Object.values(cliConfig?.clis ?? {})
        .filter((cli) => cli.enabled)
        .map((cli) => ({
          id: `cli:${cli.id}`,
          label: cli.displayName || cli.id,
          value: cli.id,
          kind: "cli" as const,
          description: cli.description,
        })),
    [cliConfig?.clis],
  );
  const inlineMentionOptions = useMemo<MentionOption[]>(
    () => [...notebookOptions, ...skillOptions, ...mcpOptions, ...cliOptions],
    [cliOptions, mcpOptions, notebookOptions, skillOptions],
  );

  const mentionGroups = useMemo<MentionGroup[]>(() => {
    if (!mentionState) {
      return [];
    }

    const normalizedQuery = mentionState.query.trim().toLowerCase();
    const source =
      mentionState.trigger === "@"
        ? [...notebookOptions, ...mcpOptions, ...cliOptions]
        : skillOptions;

    const filtered = source
      .map((option) => ({
        option,
        score: rankMentionOption(option, normalizedQuery),
      }))
      .filter((item) => item.score > 0 || !normalizedQuery)
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }
        return left.option.value.localeCompare(right.option.value);
      })
      .map((item) => item.option);

    if (mentionState.trigger === "/") {
      return filtered.length > 0
        ? [
            {
              id: "skills",
              label: "Skills",
              options: filtered,
            },
          ]
        : [];
    }

    const notebook = filtered.filter((option) => option.kind === "notebook-directory");
    const mcp = filtered.filter((option) => option.kind === "mcp");
    const cli = filtered.filter((option) => option.kind === "cli");

    const groups: MentionGroup[] = [];
    if (notebook.length > 0) {
      groups.push({ id: "notebook", label: "Notebook", options: notebook });
    }
    if (mcp.length > 0) {
      groups.push({ id: "mcp", label: "MCP", options: mcp });
    }
    if (cli.length > 0) {
      groups.push({ id: "cli", label: "CLI", options: cli });
    }

    return groups;
  }, [cliOptions, mcpOptions, mentionState, notebookOptions, skillOptions]);

  async function handleSubmit(message: PromptInputMessage) {
    const submissionPayload = buildAutomationTaskSubmissionPayload({
      text: message.text,
      selectedSkills,
      selectedContexts,
      selectedMcpTools,
      selectedCliTools,
      selectedObjectMentions,
    });

    if (!submissionPayload.text.trim()) {
      return;
    }

    setStatus("submitted");
    try {
      await onSubmit(
        buildAutomationDraftRequest({
          kind: "scheduled_task",
          name: buildFallbackName(submissionPayload.text),
          prompt: submissionPayload.text,
          schedule: { ...schedule, timezone },
          skills: selectedSkills,
          implicitMentions: submissionPayload.implicitMentions,
        }),
      );
      setSelectedSkills([]);
      setSelectedContexts([]);
      setSelectedMcpTools([]);
      setSelectedCliTools([]);
      setSelectedObjectMentions([]);
      controller.textInput.clear();
    } finally {
      setStatus("ready");
    }
  }

  function insertMentionOption(option: MentionOption) {
    const textarea = textareaRef.current;
    const currentValue = controller.textInput.value;
    const selectionStart = textarea?.selectionStart ?? currentValue.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const prefix = currentValue.slice(0, selectionStart);
    const suffix = currentValue.slice(selectionEnd);
    const trigger: MentionTrigger = option.kind === "skill" ? "/" : "@";
    const mentionText = `${trigger}${option.value}`;
    const nextValue = `${prefix}${mentionText} ${suffix}`;

    controller.textInput.setInput(nextValue);

    if (option.kind === "skill") {
      setSelectedSkills((current) =>
        current.includes(option.value) ? current : [...current, option.value],
      );
    } else if (option.kind === "notebook-directory") {
      const mention = buildNotebookDirectoryObjectMention({
        value: option.value,
        label: option.label,
      });
      setSelectedObjectMentions((current) =>
        current.some(
          (item) =>
            item.objectKind === mention.objectKind && item.value === mention.value,
        )
          ? current
          : [...current, mention],
      );
    } else if (option.kind === "mcp") {
      setSelectedMcpTools((current) =>
        current.includes(option.value) ? current : [...current, option.value],
      );
    } else if (option.kind === "cli") {
      setSelectedCliTools((current) =>
        current.includes(option.value) ? current : [...current, option.value],
      );
    } else {
      setSelectedContexts((current) =>
        current.some((item) => item.value === option.value)
          ? current
          : [
              ...current,
              {
                value: option.value,
                kind: option.kind === "directory" ? "directory" : "file",
              },
            ],
      );
    }

    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) {
        return;
      }
      const nextCaret = prefix.length + mentionText.length + 1;
      target.focus();
      target.setSelectionRange(nextCaret, nextCaret);
      setMentionState(null);
      setMentionActiveIndex(0);
    });
  }

  function handleSelectionSync(event: SyntheticEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget;
    const caret = target.selectionStart ?? target.value.length;
    const resolved = resolveMentionState(target.value, caret);
    setMentionState(resolved);
    if (!resolved) {
      setMentionActiveIndex(0);
    }
  }

  function handleMentionKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const hasPrimaryModifier = event.metaKey || event.ctrlKey;
    if (hasPrimaryModifier && !event.altKey && event.key === "/") {
      event.preventDefault();
      insertTrigger("/");
      return;
    }
    if (
      hasPrimaryModifier &&
      !event.altKey &&
      (event.key === "@" || (event.shiftKey && event.key === "2"))
    ) {
      event.preventDefault();
      insertTrigger("@");
      return;
    }

    if (!mentionState) {
      return;
    }

    const flatOptions = mentionGroups.flatMap((group) => group.options);
    if (flatOptions.length === 0) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setMentionState(null);
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
        insertMentionOption(currentOption);
      }
    }
  }

  function insertTrigger(trigger: MentionTrigger) {
    const textarea = textareaRef.current;
    const value = controller.textInput.value;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const insertion = `${needsLeadingSpace ? " " : ""}${trigger}`;
    const nextValue = `${before}${insertion}${after}`;
    const nextCaret = before.length + insertion.length;

    controller.textInput.setInput(nextValue);

    requestAnimationFrame(() => {
      const target = textareaRef.current;
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
  }

  const hasContent =
    controller.textInput.value.trim().length > 0 ||
    selectedSkills.length > 0 ||
    selectedObjectMentions.length > 0 ||
    selectedMcpTools.length > 0 ||
    selectedCliTools.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">任务内容</label>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              ref={textareaRef}
              placeholder="输入任务内容，支持 @笔记、/skill、MCP 和 CLI 引用"
              className="min-h-40"
              onClick={handleSelectionSync}
              onKeyDown={handleMentionKeyDown}
              onKeyUp={handleSelectionSync}
              onSelect={handleSelectionSync}
            />
          </PromptInputBody>
          {mentionState ? (
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
                                    insertMentionOption(option);
                                  }}
                                >
                                  <span className="text-muted-foreground mt-0.5">
                                    {option.kind === "skill" ? (
                                      <SparklesIcon className="size-3.5" />
                                    ) : option.kind === "mcp" ? (
                                      <WrenchIcon className="size-3.5" />
                                    ) : option.kind === "cli" ? (
                                      <SquareTerminalIcon className="size-3.5" />
                                    ) : (
                                      <FolderIcon className="size-3.5" />
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
          ) : null}
          <PromptInputFooter>
            <PromptInputTools>
              <MentionDropdown
                label="@ 笔记"
                options={notebookOptions}
                onSelect={insertMentionOption}
              />
              <MentionDropdown
                label="/ Skill"
                options={skillOptions}
                onSelect={insertMentionOption}
              />
              <MentionDropdown
                label="MCP"
                options={mcpOptions}
                onSelect={insertMentionOption}
              />
              <MentionDropdown
                label="CLI"
                options={cliOptions}
                onSelect={insertMentionOption}
              />
            </PromptInputTools>
            <PromptInputTools>
              <PromptInputSubmit
                status={status}
                disabled={
                  isPending ||
                  !hasContent ||
                  (schedule.preset === "once" && !schedule.runAt.trim())
                }
              />
            </PromptInputTools>
          </PromptInputFooter>
        </PromptInput>
      </div>

      <SelectedMentionsSummary
        selectedSkills={selectedSkills}
        selectedContexts={selectedContexts}
        selectedMcpTools={selectedMcpTools}
        selectedCliTools={selectedCliTools}
        selectedObjectMentions={selectedObjectMentions}
      />

      <ScheduleBuilder
        value={{ ...schedule, timezone }}
        onChange={(next) => setSchedule(next)}
      />

      <div className="flex justify-end">
        <Button
          onClick={() =>
            void handleSubmit({
              text: controller.textInput.value,
              files: [],
            })
          }
          disabled={
            isPending ||
            !hasContent ||
            (schedule.preset === "once" && !schedule.runAt.trim())
          }
        >
          创建任务
        </Button>
      </div>
    </div>
  );
}

function MentionDropdown({
  label,
  options,
  onSelect,
}: {
  label: string;
  options: MentionOption[];
  onSelect: (option: MentionOption) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton className="gap-1 px-2 text-xs">
          {label}
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        {options.length === 0 ? (
          <div className="text-muted-foreground px-3 py-2 text-xs">暂无可用项</div>
        ) : (
          options.map((option) => (
            <DropdownMenuItem
              key={option.id}
              className="flex items-start gap-2 px-3 py-2"
              onSelect={(event) => {
                event.preventDefault();
                onSelect(option);
              }}
            >
              <span className="text-muted-foreground mt-0.5">
                {option.kind === "skill" ? (
                  <SparklesIcon className="size-3.5" />
                ) : option.kind === "mcp" ? (
                  <WrenchIcon className="size-3.5" />
                ) : option.kind === "cli" ? (
                  <SquareTerminalIcon className="size-3.5" />
                ) : option.kind === "directory" ||
                  option.kind === "notebook-directory" ? (
                  <FolderIcon className="size-3.5" />
                ) : (
                  <FileIcon className="size-3.5" />
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
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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

function SelectedMentionsSummary({
  selectedSkills,
  selectedContexts,
  selectedMcpTools,
  selectedCliTools,
  selectedObjectMentions,
}: {
  selectedSkills: string[];
  selectedContexts: SelectedContextTag[];
  selectedMcpTools: string[];
  selectedCliTools: string[];
  selectedObjectMentions: ObjectMention[];
}) {
  const sections = [
    {
      label: "Notebook",
      values: selectedObjectMentions.map((item) => item.label),
    },
    {
      label: "Skill",
      values: selectedSkills,
    },
    {
      label: "Context",
      values: selectedContexts.map((item) => item.value),
    },
    {
      label: "MCP",
      values: selectedMcpTools,
    },
    {
      label: "CLI",
      values: selectedCliTools,
    },
  ].filter((section) => section.values.length > 0);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sections.map((section) =>
        section.values.map((value) => (
          <span
            key={`${section.label}:${value}`}
            className={cn(
              "bg-muted text-muted-foreground inline-flex items-center rounded-full px-3 py-1 text-xs",
            )}
          >
            {section.label}: {value}
          </span>
        )),
      )}
    </div>
  );
}

function buildAutomationTaskSubmissionPayload({
  text,
  selectedSkills,
  selectedContexts,
  selectedMcpTools,
  selectedCliTools,
  selectedObjectMentions,
}: {
  text: string;
  selectedSkills: string[];
  selectedContexts: SelectedContextTag[];
  selectedMcpTools: string[];
  selectedCliTools: string[];
  selectedObjectMentions: ObjectMention[];
}) {
  const trimmed = text.trim();
  const implicitMentions: AutomationComposerImplicitMention[] = [];
  const seenMentions = new Set<string>();

  const hasInlineMention = (mention: string) =>
    new RegExp(
      `(^|\\s)${mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`,
    ).test(trimmed);

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

function buildFallbackName(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  const summary = normalized.slice(0, 24).trimEnd();
  return normalized.length > 24 ? `${summary}…` : summary;
}
