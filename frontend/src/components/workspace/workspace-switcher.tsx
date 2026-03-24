"use client";

import { FolderTreeIcon } from "lucide-react";

import { Tooltip } from "@/components/workspace/tooltip";
import { useI18n } from "@/core/i18n/hooks";

export function WorkspaceSwitcher() {
  const { t } = useI18n();
  return (
    <Tooltip content={t.workspace.singleWorkspaceHint}>
      <div className="flex items-center gap-2 rounded-full border border-sidebar-border/70 bg-sidebar-accent/35 px-3 py-1 text-xs text-muted-foreground">
        <FolderTreeIcon className="size-3.5" />
        <span className="font-medium text-foreground">{t.workspace.singleWorkspaceLabel}</span>
        <span className="hidden max-w-[16rem] truncate sm:inline">
          {t.workspace.singleWorkspacePath}
        </span>
      </div>
    </Tooltip>
  );
}

