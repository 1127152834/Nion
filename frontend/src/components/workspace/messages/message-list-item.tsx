import {
  FileIcon,
  FolderIcon,
  Loader2Icon,
  SparklesIcon,
  SquareTerminalIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { memo, useMemo, type ImgHTMLAttributes } from "react";
import rehypeKatex from "rehype-katex";

import { Loader } from "@/components/ai-elements/loader";
import {
  Message as AIElementMessage,
  MessageContent as AIElementMessageContent,
  MessageResponse as AIElementMessageResponse,
  MessageToolbar,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Task, TaskTrigger } from "@/components/ai-elements/task";
import { Badge } from "@/components/ui/badge";
import { resolveArtifactURL } from "@/core/artifacts/utils";
import { useI18n } from "@/core/i18n/hooks";
import {
  extractContentFromMessage,
  extractKnowledgePageIdsFromToolMessage,
  extractReasoningContentFromMessage,
  extractShortcutSelectionsFromMessage,
  parseUploadedFiles,
  stripUploadedFilesTag,
  type FileInMessage,
} from "@/core/messages/utils";
import { useRehypeSplitWordsIntoSpans } from "@/core/rehype";
import { humanMessagePlugins } from "@/core/streamdown";
import type { Message } from "@/core/threads";
import { cn } from "@/lib/utils";

import { CopyButton } from "../copy-button";

import { MarkdownContent } from "./markdown-content";

const MAX_SELECTION_TAGS = 2;

type SelectionTag = {
  key: string;
  icon: typeof SparklesIcon;
  label: string;
  type: "skill" | "mcp" | "cli" | "context";
};

export function MessageListItem({
  className,
  message,
  isLoading,
  density = "default",
}: {
  className?: string;
  message: Message;
  isLoading?: boolean;
  density?: "default" | "compact";
}) {
  const isHuman = message.type === "human";
  return (
    <AIElementMessage
      className={cn(
        "group/conversation-message relative w-full",
        density === "compact" && "gap-1.5 text-[0.92rem]",
        className,
      )}
      from={isHuman ? "user" : "assistant"}
    >
      <MessageContent
        className={cn(
          isHuman ? "w-fit" : "w-full",
          density === "compact" &&
            (isHuman
              ? "rounded-[1rem] px-3 py-2 text-[0.88rem] leading-6"
              : "text-[0.88rem] leading-6"),
        )}
        message={message}
        isLoading={isLoading}
        density={density}
      />
      {!isLoading && (
        <MessageToolbar
          className={cn(
            isHuman ? "-bottom-9 justify-end" : "-bottom-8",
            "absolute right-0 left-0 z-20 opacity-0 transition-opacity delay-200 duration-300 group-hover/conversation-message:opacity-100",
            density === "compact" && "hidden",
          )}
        >
          <div className="flex gap-1">
            <CopyButton
              clipboardData={
                extractContentFromMessage(message) ??
                extractReasoningContentFromMessage(message) ??
                ""
              }
            />
          </div>
        </MessageToolbar>
      )}
    </AIElementMessage>
  );
}

/**
 * Custom image component that handles artifact URLs
 */
function MessageImage({
  src,
  alt,
  threadId,
  maxWidth = "90%",
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  threadId: string;
  maxWidth?: string;
}) {
  if (!src) return null;

  const imgClassName = cn("overflow-hidden rounded-lg", `max-w-[${maxWidth}]`);

  if (typeof src !== "string") {
    return <img className={imgClassName} src={src} alt={alt} {...props} />;
  }

  const url = src.startsWith("/mnt/") ? resolveArtifactURL(src, threadId) : src;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img className={imgClassName} src={url} alt={alt} {...props} />
    </a>
  );
}

function MessageContent_({
  className,
  message,
  isLoading = false,
  density = "default",
}: {
  className?: string;
  message: Message;
  isLoading?: boolean;
  density?: "default" | "compact";
}) {
  const rehypePlugins = useRehypeSplitWordsIntoSpans(isLoading);
  const isHuman = message.type === "human";
  const { thread_id } = useParams<{ thread_id: string }>();
  const components = useMemo(
    () => ({
      img: (props: ImgHTMLAttributes<HTMLImageElement>) => (
        <MessageImage {...props} threadId={thread_id} maxWidth="90%" />
      ),
    }),
    [thread_id],
  );

  const rawContent = extractContentFromMessage(message);
  const reasoningContent = extractReasoningContentFromMessage(message);

  const files = useMemo(() => {
    const files = message.additional_kwargs?.files;
    if (!Array.isArray(files) || files.length === 0) {
      if (rawContent.includes("<uploaded_files>")) {
        // If the content contains the <uploaded_files> tag, we return the parsed files from the content for backward compatibility.
        return parseUploadedFiles(rawContent);
      }
      return null;
    }
    return files as FileInMessage[];
  }, [message.additional_kwargs?.files, rawContent]);

  const contentToDisplay = useMemo(() => {
    if (isHuman) {
      return rawContent ? stripUploadedFilesTag(rawContent) : "";
    }
    return rawContent ?? "";
  }, [rawContent, isHuman]);

  const filesList =
    files && files.length > 0 && thread_id ? (
      <RichFilesList files={files} threadId={thread_id} />
    ) : null;
  const shortcutSelections = extractShortcutSelectionsFromMessage(message);

  const selectionTagItems = useMemo<SelectionTag[]>(() => {
    if (!isHuman || !shortcutSelections) {
      return [];
    }

    const contextTags = shortcutSelections.contexts.map((context) => ({
      key: `context:${context.value}`,
      icon: context.kind === "directory" ? FolderIcon : FileIcon,
      label: context.value,
      type: "context" as const,
    }));
    const skillTags = shortcutSelections.skills.map((skill) => ({
      key: `skill:${skill}`,
      icon: SparklesIcon,
      label: skill,
      type: "skill" as const,
    }));
    const mcpTags = shortcutSelections.mcpTools.map((tool) => ({
      key: `mcp:${tool}`,
      icon: WrenchIcon,
      label: tool,
      type: "mcp" as const,
    }));
    const cliTags = shortcutSelections.cliTools.map((tool) => ({
      key: `cli:${tool}`,
      icon: SquareTerminalIcon,
      label: tool,
      type: "cli" as const,
    }));

    return [...skillTags, ...mcpTags, ...cliTags, ...contextTags];
  }, [isHuman, shortcutSelections]);

  const selectionTags =
    selectionTagItems.length > 0 ? (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {selectionTagItems.slice(0, MAX_SELECTION_TAGS).map((tag) => {
          const Icon = tag.icon;
          return (
            <Badge
              key={tag.key}
              variant="secondary"
              data-selection-type={tag.type}
              className={cn(
                "max-w-44 gap-1 rounded-full px-2.5 py-1 text-[11px]",
                tag.type === "skill" && "bg-[#eef6ff] text-[#1859b8]",
                tag.type === "mcp" && "bg-[#eefbf3] text-[#197a43]",
                tag.type === "cli" && "bg-[#fff5e8] text-[#a35a00]",
                tag.type === "context" && "bg-[#f3f4f6] text-[#4b5563]",
              )}
            >
              <Icon className="size-3 shrink-0" />
              <span className="truncate">{tag.label}</span>
            </Badge>
          );
        })}
        {selectionTagItems.length > MAX_SELECTION_TAGS ? (
          <Badge
            key="selection-tags-overflow"
            variant="secondary"
            className="rounded-full px-2.5 py-1 text-[11px]"
          >
            +{selectionTagItems.length - MAX_SELECTION_TAGS}
          </Badge>
        ) : null}
      </div>
    ) : null;

  const knowledgePageLinks = useMemo(() => {
    const pageIds = extractKnowledgePageIdsFromToolMessage(message);
    if (pageIds.length === 0) {
      return null;
    }
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {pageIds.map((pageId) => (
          <Link
            key={pageId}
            href={`/workspace/knowledge/pages/${encodeURIComponent(pageId)}`}
            className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/40"
          >
            引用知识页: {pageId}
          </Link>
        ))}
      </div>
    );
  }, [message]);

  // Uploading state: mock AI message shown while files upload
  if (message.additional_kwargs?.element === "task") {
    return (
      <AIElementMessageContent className={className}>
        <Task defaultOpen={false}>
          <TaskTrigger title="">
            <div className="text-muted-foreground flex w-full cursor-default items-center gap-2 text-sm select-none">
              <Loader className="size-4" />
              <span>{contentToDisplay}</span>
            </div>
          </TaskTrigger>
        </Task>
      </AIElementMessageContent>
    );
  }

  // Reasoning-only AI message (no main response content yet)
  if (!isHuman && reasoningContent && !rawContent) {
    return (
      <AIElementMessageContent className={className}>
        <Reasoning isStreaming={isLoading}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningContent}</ReasoningContent>
        </Reasoning>
      </AIElementMessageContent>
    );
  }

  if (isHuman) {
    const messageResponse = contentToDisplay ? (
      <AIElementMessageResponse
        remarkPlugins={humanMessagePlugins.remarkPlugins}
        rehypePlugins={humanMessagePlugins.rehypePlugins}
        components={components}
        parseIncompleteMarkdown={false}
      >
        {contentToDisplay}
      </AIElementMessageResponse>
    ) : null;
    return (
      <div className={cn("ml-auto flex flex-col gap-2", className)}>
        {filesList}
        {messageResponse && (
          <AIElementMessageContent
            className={cn(
              "w-fit",
              density === "compact" &&
                "bg-[color-mix(in_srgb,var(--notebook-muted)_74%,var(--notebook-panel)_26%)] text-[var(--notebook-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38)]",
            )}
          >
            {messageResponse}
          </AIElementMessageContent>
        )}
        {selectionTags}
      </div>
    );
  }

  return (
    <AIElementMessageContent className={className}>
      {filesList}
      <MarkdownContent
        content={contentToDisplay}
        isLoading={isLoading}
        rehypePlugins={[...rehypePlugins, [rehypeKatex, { output: "html" }]]}
        className={cn("my-3", density === "compact" && "my-1.5")}
        components={components}
      />
      {knowledgePageLinks}
    </AIElementMessageContent>
  );
}

/**
 * Get file extension and check helpers
 */
const getFileExt = (filename: string) =>
  filename.split(".").pop()?.toLowerCase() ?? "";

const FILE_TYPE_MAP: Record<string, string> = {
  json: "JSON",
  csv: "CSV",
  txt: "TXT",
  md: "Markdown",
  py: "Python",
  js: "JavaScript",
  ts: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  html: "HTML",
  css: "CSS",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  pdf: "PDF",
  png: "PNG",
  jpg: "JPG",
  jpeg: "JPEG",
  gif: "GIF",
  svg: "SVG",
  zip: "ZIP",
  tar: "TAR",
  gz: "GZ",
};

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];

function getFileTypeLabel(filename: string): string {
  const ext = getFileExt(filename);
  return FILE_TYPE_MAP[ext] ?? (ext.toUpperCase() || "FILE");
}

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(getFileExt(filename));
}

/**
 * Format bytes to human-readable size string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * List of files from additional_kwargs.files (with optional upload status)
 */
function RichFilesList({
  files,
  threadId,
}: {
  files: FileInMessage[];
  threadId: string;
}) {
  if (files.length === 0) return null;
  const imageFiles = files.filter(
    (file) => file.status === "uploading" || isImageFile(file.filename),
  );
  const nonImageFiles = files.filter(
    (file) => file.status !== "uploading" && !isImageFile(file.filename),
  );
  return (
    <div className="mb-2 flex flex-col items-end gap-2">
      {imageFiles.length > 0 ? (
        <div className="flex flex-wrap justify-end gap-2">
          {imageFiles.map((file, index) => (
            <RichFileCard
              key={`${file.filename}-${index}`}
              file={file}
              threadId={threadId}
            />
          ))}
        </div>
      ) : null}
      {nonImageFiles.length > 0 ? (
        <div className="flex flex-wrap justify-end gap-2">
          {nonImageFiles.map((file, index) => (
            <RichFileCard
              key={`${file.filename}-${index}`}
              file={file}
              threadId={threadId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Single file card that handles FileInMessage (supports uploading state)
 */
function RichFileCard({
  file,
  threadId,
}: {
  file: FileInMessage;
  threadId: string;
}) {
  const { t } = useI18n();
  const isUploading = file.status === "uploading";
  const isImage = isImageFile(file.filename);

  if (isUploading) {
    return (
      <div className="bg-background border-border/40 flex max-w-50 min-w-30 flex-col gap-1 rounded-lg border p-3 opacity-60 shadow-sm">
        <div className="flex items-start gap-2">
          <Loader2Icon className="text-muted-foreground mt-0.5 size-4 shrink-0 animate-spin" />
          <span
            className="text-foreground truncate text-sm font-medium"
            title={file.filename}
          >
            {file.filename}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className="rounded px-1.5 py-0.5 text-[10px] font-normal"
          >
            {getFileTypeLabel(file.filename)}
          </Badge>
          <span className="text-muted-foreground text-[10px]">
            {t.uploads.uploading}
          </span>
        </div>
      </div>
    );
  }

  if (!file.path) return null;

  const fileUrl = resolveArtifactURL(file.path, threadId);

  if (isImage) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group border-border/40 relative block overflow-hidden rounded-2xl border shadow-sm"
      >
        <img
          src={fileUrl}
          alt={file.filename}
          className="max-h-60 w-auto max-w-72 object-cover transition-transform group-hover:scale-105"
        />
      </a>
    );
  }

  return (
    <div className="bg-background border-border/40 flex max-w-50 min-w-30 flex-col gap-1 rounded-lg border p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <FileIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <span
          className="text-foreground truncate text-sm font-medium"
          title={file.filename}
        >
          {file.filename}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="secondary"
          className="rounded px-1.5 py-0.5 text-[10px] font-normal"
        >
          {getFileTypeLabel(file.filename)}
        </Badge>
        <span className="text-muted-foreground text-[10px]">
          {formatBytes(file.size)}
        </span>
      </div>
    </div>
  );
}

const MessageContent = memo(MessageContent_);
