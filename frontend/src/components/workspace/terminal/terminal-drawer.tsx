"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpDownIcon, SquareTerminalIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { loadThreadFilesMeta } from "@/core/files";
import { useTerminal } from "@/hooks/use-terminal";

import { TerminalInstance } from "./terminal-instance";

const DEFAULT_HEIGHT = 250;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 600;

type TerminalDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
};

export function TerminalDrawer({
  open,
  onOpenChange,
  threadId,
}: TerminalDrawerProps) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const { data: meta } = useQuery({
    queryKey: ["threadFiles", "meta", threadId, "terminal"],
    queryFn: () => loadThreadFilesMeta(threadId, { root: "/mnt/user-data/workspace" }),
    enabled: open,
    staleTime: 5_000,
  });
  const terminal = useTerminal({
    cwd: meta?.actual_root ?? null,
    sessionId: threadId,
  });

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = height;
      const onMove = (moveEvent: MouseEvent) => {
        const delta = startY - moveEvent.clientY;
        setHeight(
          Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta)),
        );
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [height],
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className="shrink-0 bg-background/88 px-4 pb-4 backdrop-blur-sm"
      style={{ height }}
    >
      <div className="mx-auto flex h-full w-full max-w-(--container-width-xl) flex-col overflow-hidden rounded-t-2xl border border-border/50 border-b-0 bg-background shadow-2xl">
        <div
          className="h-1 cursor-row-resize transition-colors hover:bg-primary/20"
          onMouseDown={handleMouseDown}
        />
        <div className="flex h-12 items-center justify-between border-b border-border/40 px-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <SquareTerminalIcon className="size-3.5" />
              工作区终端
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
              在当前线程工作目录中执行命令
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setHeight(DEFAULT_HEIGHT)}
              title="重置终端高度"
            >
              <ArrowUpDownIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              title="关闭工作区终端"
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {terminal.isDesktop ? (
            <TerminalInstance terminal={terminal} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              工作区终端仅在桌面版可用
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
