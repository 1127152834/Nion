import { useQuery } from "@tanstack/react-query";
import { FilesIcon, FolderIcon, XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";

import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { loadThreadFilesMeta, loadThreadFilesTree } from "@/core/files";
import { useI18n } from "@/core/i18n/hooks";
import { env } from "@/env";
import { cn } from "@/lib/utils";

import {
  ArtifactFileDetail,
  ArtifactFileList,
  useArtifacts,
} from "../artifacts";
import { useThread } from "../messages/context";
import { buildChatPanelIds } from "./panel-ids";

const CLOSE_MODE = { chat: 100, artifacts: 0 };
const OPEN_MODE = { chat: 60, artifacts: 40 };

const ChatBox: React.FC<{ children: React.ReactNode; threadId: string }> = ({
  children,
  threadId,
}) => {
  const { t } = useI18n();
  const { thread } = useThread();
  const pathname = usePathname();
  const threadIdRef = useRef(threadId);
  const layoutRef = useRef<GroupImperativeHandle>(null);

  const {
    artifacts,
    open: artifactsOpen,
    setOpen: setArtifactsOpen,
    setArtifacts,
    select: selectArtifact,
    deselect,
    panelType,
    selectedArtifact,
  } = useArtifacts();

  const [autoSelectFirstArtifact, setAutoSelectFirstArtifact] = useState(true);
  useEffect(() => {
    if (threadIdRef.current !== threadId) {
      threadIdRef.current = threadId;
      deselect();
    }

    // Update artifacts from the current thread
    setArtifacts(thread.values.artifacts);

    // DO NOT automatically deselect the artifact when switching threads, because the artifacts auto discovering is not work now.
    // if (
    //   selectedArtifact &&
    //   !thread.values.artifacts?.includes(selectedArtifact)
    // ) {
    //   deselect();
    // }

    if (
      env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" &&
      autoSelectFirstArtifact
    ) {
      if (thread?.values?.artifacts?.length > 0) {
        setAutoSelectFirstArtifact(false);
        selectArtifact(thread.values.artifacts[0]!);
      }
    }
  }, [
    threadId,
    autoSelectFirstArtifact,
    deselect,
    selectArtifact,
    selectedArtifact,
    setArtifacts,
    thread.values.artifacts,
  ]);

  const artifactPanelOpen = useMemo(() => {
    if (env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true") {
      return artifactsOpen && artifacts?.length > 0;
    }
    return artifactsOpen;
  }, [artifactsOpen, artifacts]);

  useEffect(() => {
    if (layoutRef.current) {
      if (artifactPanelOpen) {
        layoutRef.current.setLayout(OPEN_MODE);
      } else {
        layoutRef.current.setLayout(CLOSE_MODE);
      }
    }
  }, [artifactPanelOpen]);

  const panelTitle =
    panelType === "working-directory"
      ? t.common.workingDirectory
      : t.common.artifacts;

  const { data: workingDirectoryMeta } = useQuery({
    queryKey: ["threadFiles", "meta", threadId],
    queryFn: () =>
      loadThreadFilesMeta(threadId, { root: "/mnt/user-data/workspace" }),
    enabled: artifactPanelOpen && panelType === "working-directory",
    staleTime: 5_000,
  });

  const { data: workingDirectoryTree } = useQuery({
    queryKey: ["threadFiles", "tree", threadId],
    queryFn: () =>
      loadThreadFilesTree(threadId, {
        root: "/mnt/user-data/workspace",
        depth: 6,
        includeHidden: false,
        maxNodes: 2000,
      }),
    enabled: artifactPanelOpen && panelType === "working-directory",
    staleTime: 5_000,
  });

  const workingDirectoryFiles = useMemo(
    () => workingDirectoryTree?.files.map((item) => item.path) ?? [],
    [workingDirectoryTree],
  );

  const displayedFiles =
    panelType === "working-directory"
      ? workingDirectoryFiles
      : (thread.values.artifacts ?? []);
  const panelIds = useMemo(() => buildChatPanelIds(pathname), [pathname]);

  return (
    <ResizablePanelGroup
      id={panelIds.groupId}
      orientation="horizontal"
      defaultLayout={{ chat: 100, artifacts: 0 }}
      groupRef={layoutRef}
    >
      <ResizablePanel className="relative" defaultSize={100} id="chat">
        {children}
      </ResizablePanel>
      <ResizableHandle
        id={panelIds.separatorId}
        className={cn(
          "opacity-33 hover:opacity-100",
          !artifactPanelOpen && "pointer-events-none opacity-0",
        )}
      />
      <ResizablePanel
        className={cn(
          "transition-all duration-300 ease-in-out",
          !artifactsOpen && "opacity-0",
        )}
        id="artifacts"
      >
        <div
          className={cn(
            "h-full p-4 transition-transform duration-300 ease-in-out",
            artifactPanelOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          {selectedArtifact ? (
            <ArtifactFileDetail
              className="size-full"
              filepath={selectedArtifact}
              files={displayedFiles}
              threadId={threadId}
            />
          ) : (
            <div className="relative flex size-full justify-center">
              <div className="absolute top-1 right-1 z-30">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    setArtifactsOpen(false);
                  }}
                >
                  <XIcon />
                </Button>
              </div>
              {displayedFiles.length === 0 ? (
                <ConversationEmptyState
                  icon={
                    panelType === "working-directory" ? (
                      <FolderIcon />
                    ) : (
                      <FilesIcon />
                    )
                  }
                  title={panelTitle}
                  description={
                    panelType === "working-directory"
                      ? workingDirectoryMeta?.actual_root ?? t.common.browseWorkspace
                      : "Select an artifact to view its details"
                  }
                />
              ) : (
                <div className="flex size-full max-w-(--container-width-sm) flex-col justify-center p-4 pt-8">
                  <header className="shrink-0">
                    <h2 className="text-lg font-medium">{panelTitle}</h2>
                    {panelType === "working-directory" ? (
                      <div className="text-muted-foreground mt-1 space-y-1 text-sm">
                        <p>{t.common.browseWorkspace}</p>
                        {workingDirectoryMeta?.actual_root ? (
                          <p className="truncate font-mono text-xs">
                            {workingDirectoryMeta.actual_root}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </header>
                  <main className="min-h-0 grow">
                    <ArtifactFileList
                      className="max-w-(--container-width-sm) p-4 pt-12"
                      files={displayedFiles}
                      threadId={threadId}
                    />
                  </main>
                </div>
              )}
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export { ChatBox };
