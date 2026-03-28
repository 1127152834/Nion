"use client";

import { ArrowUpDownIcon, SquareTerminalIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { loadThreadFilesMeta } from "@/core/files";
import { useI18n } from "@/core/i18n/hooks";
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
  const { t } = useI18n();
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
      className="shrink-0 border-t border-border/40 bg-background"
      style={{ height }}
    >
      <div
        className="h-1 cursor-row-resize transition-colors hover:bg-primary/20"
        onMouseDown={handleMouseDown}
      />
      <div className="flex h-8 items-center justify-between border-b border-border/40 px-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <SquareTerminalIcon className="size-3.5" />
          {t.pages.appName} Terminal
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHeight(DEFAULT_HEIGHT)}
          >
            <ArrowUpDownIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="h-[calc(100%-2.25rem-0.25rem)] overflow-hidden">
        {terminal.isDesktop ? (
          <TerminalInstance terminal={terminal} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Terminal is only available in the desktop app
          </div>
        )}
      </div>
    </div>
  );
}
