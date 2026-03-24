"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";
import { useInstallSkillFromArtifact } from "@/core/skills/hooks";

type SkillImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SkillImportDialog({
  open,
  onOpenChange,
}: SkillImportDialogProps) {
  const { t } = useI18n();
  const settingsLike = t.settings as {
    skillImportDialog?: Record<string, string>;
  };
  const fallbackCopy = {
    title: "Import skill",
    description:
      "Install a .skill artifact by providing its source thread ID and virtual artifact path.",
    threadId: "Thread ID",
    threadIdPlaceholder: "thread-id",
    path: "Artifact path",
    pathPlaceholder: "/mnt/user-data/outputs/my-skill.skill",
    install: "Install",
    installing: "Installing...",
    close: "Close",
    success: 'Skill "{name}" installed',
  };
  const copy = {
    ...fallbackCopy,
    ...(settingsLike.skillImportDialog ?? {}),
  };

  const [threadId, setThreadId] = useState("");
  const [path, setPath] = useState("");
  const installMutation = useInstallSkillFromArtifact();

  const handleInstall = () => {
    installMutation.mutate(
      {
        thread_id: threadId.trim(),
        path: path.trim(),
      },
      {
        onSuccess: (result) => {
          toast.success(copy.success.replaceAll("{name}", result.skill_name));
          setThreadId("");
          setPath("");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : copy.description,
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.threadId}</div>
            <Input
              value={threadId}
              placeholder={copy.threadIdPlaceholder}
              onChange={(event) => setThreadId(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.path}</div>
            <Input
              value={path}
              placeholder={copy.pathPlaceholder}
              onChange={(event) => setPath(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {copy.close}
          </Button>
          <Button
            type="button"
            disabled={
              installMutation.isPending ||
              threadId.trim() === "" ||
              path.trim() === ""
            }
            onClick={handleInstall}
          >
            {installMutation.isPending ? copy.installing : copy.install}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
