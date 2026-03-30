"use client";

import { Loader2Icon, SendIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type NotebookAssistantComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
  placeholder?: string;
};

export function NotebookAssistantComposer({
  disabled = false,
  isSending = false,
  onSubmit,
  placeholder = "继续围绕这篇笔记提问、改写或拆解任务",
}: NotebookAssistantComposerProps) {
  const [value, setValue] = useState("");

  async function handleSubmit() {
    const nextValue = value.trim();
    if (!nextValue || disabled || isSending) {
      return;
    }
    await onSubmit(nextValue);
    setValue("");
  }

  return (
    <div className="rounded-[1.25rem] border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        disabled={disabled || isSending}
        placeholder={placeholder}
        className="min-h-24 resize-none border-0 bg-transparent px-0 py-0 text-sm leading-6 text-[var(--notebook-ink)] shadow-none focus-visible:ring-0"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--notebook-soft-text)]">
          Enter 发送，Shift + Enter 换行
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={disabled || isSending || value.trim().length === 0}
          className="rounded-full bg-[var(--notebook-brand)] px-4 text-[var(--notebook-panel)] hover:opacity-90"
        >
          {isSending ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
          发送
        </Button>
      </div>
    </div>
  );
}
