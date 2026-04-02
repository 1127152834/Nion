import {
  BookPlusIcon,
  Code2Icon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  LoaderIcon,
  PackageIcon,
  SquareArrowOutUpRightIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Select, SelectItem } from "@/components/ui/select";
import {
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CodeEditor } from "@/components/workspace/code-editor";
import { useArtifactContent } from "@/core/artifacts/hooks";
import { urlOfArtifact } from "@/core/artifacts/utils";
import { useI18n } from "@/core/i18n/hooks";
import {
  buildNotebookDirectoryOptions,
  useArchiveNotebookAsset,
  useNotebookTree,
} from "@/core/notebook";
import { installSkill } from "@/core/skills/api";
import { streamdownPlugins } from "@/core/streamdown";
import { checkCodeFile, getFileName } from "@/core/utils/files";
import { env } from "@/env";
import { cn } from "@/lib/utils";

import { ArtifactLink } from "../citations/artifact-link";
import { useThread } from "../messages/context";
import { NotebookDialogShell } from "../notebook/notebook-dialog-shell";
import { NotebookFolderPicker } from "../notebook/notebook-folder-picker";
import { Tooltip } from "../tooltip";

import { useArtifacts } from "./context";

export function ArtifactFileDetail({
  className,
  filepath: filepathFromProps,
  threadId,
  files,
}: {
  className?: string;
  filepath: string;
  threadId: string;
  files?: string[];
}) {
  const { t } = useI18n();
  const { artifacts, setOpen, select } = useArtifacts();
  const isWriteFile = useMemo(() => {
    return filepathFromProps.startsWith("write-file:");
  }, [filepathFromProps]);
  const filepath = useMemo(() => {
    if (isWriteFile) {
      const url = new URL(filepathFromProps);
      return decodeURIComponent(url.pathname);
    }
    return filepathFromProps;
  }, [filepathFromProps, isWriteFile]);
  const isSkillFile = useMemo(() => {
    return filepath.endsWith(".skill");
  }, [filepath]);
  const { isCodeFile, language } = useMemo(() => {
    if (isWriteFile) {
      let language = checkCodeFile(filepath).language;
      language ??= "text";
      return { isCodeFile: true, language };
    }
    // Treat .skill files as markdown (they contain SKILL.md)
    if (isSkillFile) {
      return { isCodeFile: true, language: "markdown" };
    }
    return checkCodeFile(filepath);
  }, [filepath, isWriteFile, isSkillFile]);
  const isSupportPreview = useMemo(() => {
    return language === "html" || language === "markdown";
  }, [language]);
  const { content, isLoading, error } = useArtifactContent({
    threadId,
    filepath: filepathFromProps,
    enabled: isCodeFile && !isWriteFile,
  });

  const displayContent = content ?? "";

  const [viewMode, setViewMode] = useState<"code" | "preview">("code");
  const [isInstalling, setIsInstalling] = useState(false);
  const [saveToNotebookOpen, setSaveToNotebookOpen] = useState(false);
  const [notebookDirectory, setNotebookDirectory] = useState("inbox");
  const { isMock } = useThread();
  const archiveNotebookAsset = useArchiveNotebookAsset();
  const { tree: notebookTree } = useNotebookTree();
  const notebookDirectoryOptions = useMemo(
    () =>
      buildNotebookDirectoryOptions({
        entries: notebookTree.directories,
        includeInbox: true,
        inboxLabel: t.notebookPage.inboxLabel,
        rootLabel: t.notebookPage.rootFolderLabel,
      }),
    [notebookTree.directories, t.notebookPage.inboxLabel, t.notebookPage.rootFolderLabel],
  );
  useEffect(() => {
    if (isSupportPreview) {
      setViewMode("preview");
    } else {
      setViewMode("code");
    }
  }, [isSupportPreview]);

  const handleInstallSkill = useCallback(async () => {
    if (isInstalling) return;

    setIsInstalling(true);
    try {
      const result = await installSkill({
        thread_id: threadId,
        path: filepath,
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message ?? "Failed to install skill");
      }
    } catch (error) {
      console.error("Failed to install skill:", error);
      toast.error("Failed to install skill");
    } finally {
      setIsInstalling(false);
    }
  }, [threadId, filepath, isInstalling]);

  const handleArchiveToNotebook = useCallback(async () => {
    try {
      const asset = await archiveNotebookAsset.mutateAsync({
        thread_id: threadId,
        artifact_path: filepath,
        directory: notebookDirectory,
      });
      setSaveToNotebookOpen(false);
      toast.success(t.notebookPage.saveArtifactSuccess.replace("{title}", asset.title));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存到笔记失败");
    }
  }, [archiveNotebookAsset, filepath, notebookDirectory, t.notebookPage.saveArtifactSuccess, threadId]);

  return (
    <>
      <Artifact className={cn(className)}>
        <ArtifactHeader className="px-2">
          <div className="flex items-center gap-2">
            <ArtifactTitle>
              {isWriteFile ? (
                <div className="px-2">{getFileName(filepath)}</div>
              ) : (
                <Select value={filepath} onValueChange={select}>
                  <SelectTrigger className="border-none bg-transparent! shadow-none select-none focus:outline-0 active:outline-0">
                    <SelectValue placeholder="Select a file" />
                  </SelectTrigger>
                  <SelectContent className="select-none">
                    <SelectGroup>
                      {(files ?? artifacts ?? []).map((filepath) => (
                        <SelectItem key={filepath} value={filepath}>
                          {getFileName(filepath)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </ArtifactTitle>
          </div>
          <div className="flex min-w-0 grow items-center justify-center">
            {isSupportPreview && (
              <ToggleGroup
                className="mx-auto"
                type="single"
                variant="outline"
                size="sm"
                value={viewMode}
                onValueChange={(value) => {
                  if (value) {
                    setViewMode(value as "code" | "preview");
                  }
                }}
              >
                <ToggleGroupItem value="code">
                  <Code2Icon />
                </ToggleGroupItem>
                <ToggleGroupItem value="preview">
                  <EyeIcon />
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ArtifactActions>
              {!isWriteFile && filepath.endsWith(".skill") && (
                <Tooltip content={t.toolCalls.skillInstallTooltip}>
                  <ArtifactAction
                    icon={isInstalling ? LoaderIcon : PackageIcon}
                    label={t.common.install}
                    tooltip={t.common.install}
                    disabled={
                      isInstalling ||
                      env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true"
                    }
                    onClick={handleInstallSkill}
                  />
                </Tooltip>
              )}
              {!isWriteFile && filepath.startsWith("/mnt/user-data/outputs/") && (
                <ArtifactAction
                  icon={BookPlusIcon}
                  label={t.notebookPage.saveArtifact}
                  tooltip={t.notebookPage.saveArtifact}
                  onClick={() => setSaveToNotebookOpen(true)}
                />
              )}
              {!isWriteFile && (
                <a href={urlOfArtifact({ filepath, threadId })} target="_blank">
                  <ArtifactAction
                    icon={SquareArrowOutUpRightIcon}
                    label={t.common.openInNewWindow}
                    tooltip={t.common.openInNewWindow}
                  />
                </a>
              )}
              {isCodeFile && (
                <ArtifactAction
                  icon={CopyIcon}
                  label={t.clipboard.copyToClipboard}
                  disabled={!content}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(displayContent ?? "");
                      toast.success(t.clipboard.copiedToClipboard);
                    } catch (error) {
                      toast.error("Failed to copy to clipboard");
                      console.error(error);
                    }
                  }}
                  tooltip={t.clipboard.copyToClipboard}
                />
              )}
              {!isWriteFile && (
                <a
                  href={urlOfArtifact({ filepath, threadId, download: true })}
                  target="_blank"
                >
                  <ArtifactAction
                    icon={DownloadIcon}
                    label={t.common.download}
                    tooltip={t.common.download}
                  />
                </a>
              )}
              <ArtifactAction
                icon={XIcon}
                label={t.common.close}
                onClick={() => setOpen(false)}
                tooltip={t.common.close}
              />
            </ArtifactActions>
          </div>
        </ArtifactHeader>
        <ArtifactContent className="p-0">
          {!isWriteFile && isLoading ? (
            <ConversationEmptyState
              icon={<LoaderIcon className="size-5 animate-spin" />}
              title="Loading file"
              description="Reading artifact content..."
            />
          ) : null}
          {!isWriteFile && error ? (
            <ConversationEmptyState
              icon={<XIcon className="size-5" />}
              title="Unable to open file"
              description={
                error instanceof Error
                  ? error.message
                  : "Artifact content could not be loaded."
              }
            />
          ) : null}
          {isSupportPreview &&
            !isLoading &&
            !error &&
            viewMode === "preview" &&
            (language === "markdown" || language === "html") && (
              <ArtifactFilePreview
                content={displayContent}
                language={language ?? "text"}
              />
            )}
          {isCodeFile && !isLoading && !error && viewMode === "code" && (
            <CodeEditor
              className="size-full resize-none rounded-none border-none"
              value={displayContent ?? ""}
              readonly
            />
          )}
          {!isCodeFile && !error && (
            <iframe
              className="size-full"
              src={urlOfArtifact({ filepath, threadId, isMock })}
            />
          )}
        </ArtifactContent>
      </Artifact>

      <NotebookDialogShell
        open={saveToNotebookOpen}
        onOpenChange={setSaveToNotebookOpen}
        icon={<BookPlusIcon className="size-5" />}
        title={t.notebookPage.saveArtifact}
      >
        <div className="space-y-4 p-6">
          <p className="text-sm leading-relaxed text-[var(--notebook-soft-text)]">
            {t.notebookPage.saveArtifactDescription}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--notebook-soft-text)]">
              {t.notebookPage.saveToLabel}
            </label>
            <NotebookFolderPicker
              options={notebookDirectoryOptions}
              placeholder={t.notebookPage.selectFolderPlaceholder}
              value={notebookDirectory}
              onValueChange={setNotebookDirectory}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleArchiveToNotebook()}
              disabled={archiveNotebookAsset.isPending}
              className="rounded-md bg-[var(--notebook-brand)] px-4 py-2 text-sm font-medium text-[var(--notebook-panel)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {archiveNotebookAsset.isPending ? t.notebookPage.saving : t.notebookPage.confirmSaveDraft}
            </button>
          </div>
        </div>
      </NotebookDialogShell>
    </>
  );
}

export function ArtifactFilePreview({
  content,
  language,
}: {
  content: string;
  language: string;
}) {
  if (language === "markdown") {
    return (
      <div className="size-full px-4">
        <Streamdown
          className="size-full"
          {...streamdownPlugins}
          components={{ a: ArtifactLink }}
        >
          {content ?? ""}
        </Streamdown>
      </div>
    );
  }
  if (language === "html") {
    return (
      <iframe
        className="size-full"
        title="Artifact preview"
        srcDoc={content}
        sandbox="allow-scripts allow-forms"
      />
    );
  }
  return null;
}
