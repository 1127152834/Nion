"use client";

import { Loader2Icon, SendIcon, SquareIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type NotebookAssistantComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
  onStop?: () => Promise<void> | void;
  placeholder?: string;
};

export function NotebookAssistantComposer({
  disabled = false,
  isSending = false,
  onSubmit,
  onStop,
  placeholder = "围绕当前笔记继续处理内容，或总结聊天内容并整理成笔记",
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
    <div className="notebook-assistant-composer rounded-[1.45rem] border border-[color-mix(in_srgb,var(--notebook-border)_74%,transparent)] bg-[color-mix(in_srgb,var(--notebook-panel)_94%,transparent)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_18px_34px_-30px_rgba(15,23,42,0.58)] backdrop-blur-sm">
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
        rows={2}
        className="min-h-[3.6rem] max-h-[3.6rem] resize-none overflow-y-auto border-0 bg-transparent px-0 py-0 text-[0.92rem] leading-6 text-[var(--notebook-ink)] shadow-none focus-visible:ring-0"
      />
      <div className="mt-2 flex items-center justify-end">
        {isSending ? (
          <Button
            type="button"
            size="icon"
            onClick={() => void onStop?.()}
            className="h-10 w-10 rounded-full bg-[var(--notebook-danger)] text-white shadow-[0_10px_20px_-18px_rgba(15,23,42,0.65)] transition-all duration-200 hover:opacity-90"
            aria-label="停止"
            title="停止"
          >
            <SquareIcon className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={() => void handleSubmit()}
            disabled={disabled || value.trim().length === 0}
            className="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--notebook-brand)_82%,var(--notebook-soft-text)_18%)] text-[var(--notebook-panel)] shadow-[0_10px_20px_-18px_rgba(15,23,42,0.65)] transition-all duration-200 hover:opacity-90"
            aria-label="发送"
            title="发送"
          >
            <SendIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
