"use client";

import { CheckCircleIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBackendBaseURL } from "@/core/config";
import type { CliToolDefinition } from "@/core/cli";

type CliToolInstallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: CliToolDefinition;
  method: string;
  onComplete: () => void;
  locale: string;
};

type Phase = "running" | "success" | "error";

export function CliToolInstallDialog({
  open,
  onOpenChange,
  tool,
  method,
  onComplete,
  locale,
}: CliToolInstallDialogProps) {
  const [phase, setPhase] = useState<Phase>("running");
  const [logs, setLogs] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const isZh = locale === "zh-CN";

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("running");
    setLogs([]);

    const run = async () => {
      try {
        const response = await fetch(
          `${getBackendBaseURL()}/api/cli-tools/${encodeURIComponent(tool.id)}/install`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method }),
            signal: controller.signal,
          },
        );
        if (!response.ok || !response.body) {
          setPhase("error");
          setLogs((value) => [...value, `HTTP ${response.status}: ${response.statusText}`]);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
              continue;
            }
            if (!line.startsWith("data: ")) {
              continue;
            }
            const raw = line.slice(6);
            const data = JSON.parse(raw) as string;
            if (currentEvent === "output") {
              setLogs((value) => [...value, data]);
            } else if (currentEvent === "done") {
              setPhase("success");
              if (data.trim()) {
                setLogs((value) => [...value, data]);
              }
            } else if (currentEvent === "error") {
              setPhase("error");
              setLogs((value) => [...value, data]);
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setPhase("error");
          setLogs((value) => [...value, (error as Error).message]);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [method, open, tool.id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const installMethod = tool.installMethods.find((item) => item.method === method);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && phase === "success") {
          onComplete();
        }
        if (!nextOpen) {
          abortRef.current?.abort();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {phase === "running" && (
              <Loader2Icon className="size-5 animate-spin text-primary" />
            )}
            {phase === "success" && (
              <CheckCircleIcon className="size-5 text-green-600" />
            )}
            {phase === "error" && <XIcon className="size-5 text-destructive" />}
            {phase === "running"
              ? `${isZh ? "正在安装" : "Installing"} ${tool.name}...`
              : phase === "success"
                ? isZh
                  ? "安装成功"
                  : "Install successful"
                : isZh
                  ? "安装失败"
                  : "Install failed"}
          </DialogTitle>
        </DialogHeader>

        {installMethod && (
          <div className="rounded bg-muted/30 px-2 py-1 font-mono text-xs text-muted-foreground">
            $ {installMethod.command}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
          {logs.length === 0 && phase === "running" && (
            <span className="text-muted-foreground">
              {isZh ? "安装中..." : "Installing..."}
            </span>
          )}
          {logs.map((line, index) => (
            <div key={`${index}-${line}`} className="break-all whitespace-pre-wrap">
              {line}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              abortRef.current?.abort();
              if (phase === "success") {
                onComplete();
              }
              onOpenChange(false);
            }}
          >
            {phase === "running"
              ? isZh
                ? "取消"
                : "Cancel"
              : isZh
                ? "关闭"
                : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
