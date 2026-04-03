"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AutomationJobCreateInput } from "@/core/automation/types";

import { AutomationTaskComposer } from "./automation-task-composer";

type AutomationTaskDialogProps = {
  triggerLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isPending: boolean;
  onCreate: (input: AutomationJobCreateInput) => Promise<unknown>;
};

export function AutomationTaskDialog({
  triggerLabel,
  open,
  onOpenChange,
  isPending,
  onCreate,
}: AutomationTaskDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const resolvedOpen = open ?? internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>添加定时任务</DialogTitle>
          <DialogDescription>
            任务内容复用聊天输入能力，支持 @笔记、/skill 以及工具引用。
          </DialogDescription>
        </DialogHeader>

        <PromptInputProvider>
          <AutomationTaskComposer
            isPending={isPending}
            onSubmit={async (input) => {
              await onCreate(input);
              handleOpenChange(false);
            }}
          />
        </PromptInputProvider>
      </DialogContent>
    </Dialog>
  );
}
