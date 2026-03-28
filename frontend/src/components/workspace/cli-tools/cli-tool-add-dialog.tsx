"use client";

import { CheckCircleIcon, Loader2Icon, TerminalIcon, XCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
import { createCustomCliTool } from "@/core/cli";

type CliToolAddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  locale: string;
};

type ValidateStatus = "idle" | "validating" | "valid" | "invalid";

export function CliToolAddDialog({
  open,
  onOpenChange,
  onComplete,
  locale,
}: CliToolAddDialogProps) {
  const [binPath, setBinPath] = useState("");
  const [name, setName] = useState("");
  const [validateStatus, setValidateStatus] = useState<ValidateStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isZh = locale === "zh-CN";

  useEffect(() => {
    if (!open) {
      return;
    }
    setBinPath("");
    setName("");
    setValidateStatus("idle");
    setSubmitting(false);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TerminalIcon className="size-4" />
            {isZh ? "按路径添加工具" : "Add tool by path"}
          </DialogTitle>
          <DialogDescription>
            {isZh
              ? "手动注册一个已经安装在本机上的可执行文件。"
              : "Register an already-installed executable by absolute path."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isZh ? "二进制路径" : "Binary path"}
            </label>
            <div className="relative">
              <Input
                ref={inputRef}
                value={binPath}
                onChange={(event) => {
                  setBinPath(event.target.value);
                  setError(null);
                  setValidateStatus("idle");
                }}
                placeholder={
                  isZh ? "/usr/local/bin/my-tool" : "/usr/local/bin/my-tool"
                }
                className="pr-9 font-mono"
              />
              {validateStatus === "validating" && (
                <Loader2Icon className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
              {validateStatus === "valid" && (
                <CheckCircleIcon className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-green-600" />
              )}
              {validateStatus === "invalid" && (
                <XCircleIcon className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-destructive" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isZh ? "显示名称" : "Display name"}
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={isZh ? "可选" : "Optional"}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {isZh ? "取消" : "Cancel"}
          </Button>
          <Button
            size="sm"
            disabled={!binPath.trim() || submitting}
            className="gap-1.5"
            onClick={async () => {
              setSubmitting(true);
              setValidateStatus("validating");
              setError(null);
              try {
                await createCustomCliTool({
                  binPath: binPath.trim(),
                  name: name.trim() || undefined,
                });
                setValidateStatus("valid");
                onComplete();
                onOpenChange(false);
              } catch (caughtError) {
                setValidateStatus("invalid");
                setError(
                  caughtError instanceof Error
                    ? caughtError.message
                    : isZh
                      ? "添加失败"
                      : "Failed to add tool",
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting && <Loader2Icon className="size-4 animate-spin" />}
            {isZh ? "添加" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
