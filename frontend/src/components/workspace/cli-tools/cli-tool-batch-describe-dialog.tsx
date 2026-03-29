"use client";

import { CheckCircleIcon, Loader2Icon, SparklesIcon, XCircleIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  describeCliTool,
  loadCliToolsDescribeOptions,
  type CliToolDescriptionRecord,
} from "@/core/cli";

type AutoDescCache = Record<string, CliToolDescriptionRecord>;

type CliToolBatchDescribeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolIds: string[];
  existingDescriptions: AutoDescCache;
  onComplete: (results: AutoDescCache) => void;
  locale: string;
};

type Phase = "select" | "running" | "done";

type ToolResult = {
  id: string;
  status: "pending" | "loading" | "success" | "error";
  error?: string;
};

export function CliToolBatchDescribeDialog({
  open,
  onOpenChange,
  toolIds,
  existingDescriptions,
  onComplete,
  locale,
}: CliToolBatchDescribeDialogProps) {
  const [phase, setPhase] = useState<Phase>("select");
  const [providerGroups, setProviderGroups] = useState<
    Array<{
      provider_id: string;
      provider_name: string;
      models: Array<{ value: string; label: string }>;
    }>
  >([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [toolResults, setToolResults] = useState<ToolResult[]>([]);
  const [skipExisting, setSkipExisting] = useState(true);
  const resultsRef = useRef<AutoDescCache>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const isZh = locale === "zh-CN";

  useEffect(() => {
    if (!open) {
      return;
    }
    setPhase("select");
    resultsRef.current = {};
    setToolResults([]);
    void loadCliToolsDescribeOptions()
      .then((payload) => {
        setProviderGroups(payload.groups);
        const defaultGroup =
          payload.groups.find(
            (group) => group.provider_id === payload.default_provider_id,
          ) ?? payload.groups[0];
        if (!defaultGroup) {
          return;
        }
        setSelectedProviderId(defaultGroup.provider_id);
        setSelectedModel(defaultGroup.models[0]?.value ?? "");
      })
      .catch(() => {
        setProviderGroups([]);
      });
  }, [open]);

  const selectedGroup = useMemo(
    () =>
      providerGroups.find((group) => group.provider_id === selectedProviderId) ??
      null,
    [providerGroups, selectedProviderId],
  );

  const toolsToProcess = useMemo(
    () =>
      skipExisting
        ? toolIds.filter((toolId) => !existingDescriptions[toolId])
        : toolIds,
    [existingDescriptions, skipExisting, toolIds],
  );

  const successCount = toolResults.filter((item) => item.status === "success").length;
  const errorCount = toolResults.filter((item) => item.status === "error").length;
  const existingCount = toolIds.filter((toolId) => Boolean(existingDescriptions[toolId])).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          abortControllerRef.current?.abort();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4" />
            {isZh ? "AI 批量描述" : "AI Describe"}
          </DialogTitle>
          <DialogDescription>
            {isZh
              ? "用 AI 为已安装工具批量生成描述。"
              : "Use AI to generate descriptions for installed tools."}
          </DialogDescription>
        </DialogHeader>

        {phase === "select" && providerGroups.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            {isZh ? "当前没有可用模型。" : "No models available right now."}
          </p>
        )}

        {phase === "select" && providerGroups.length > 0 && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isZh ? "Provider" : "Provider"}
              </label>
              <Select
                value={selectedProviderId}
                onValueChange={(value) => {
                  setSelectedProviderId(value);
                  const nextGroup = providerGroups.find(
                    (group) => group.provider_id === value,
                  );
                  setSelectedModel(nextGroup?.models[0]?.value ?? "");
                }}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providerGroups.map((group) => (
                    <SelectItem key={group.provider_id} value={group.provider_id}>
                      {group.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isZh ? "模型" : "Model"}
              </label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(selectedGroup?.models ?? []).map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {toolIds.some((toolId) => Boolean(existingDescriptions[toolId])) && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipExisting}
                  onChange={(event) => setSkipExisting(event.target.checked)}
                />
                <span>
                  {isZh ? "跳过已有描述" : "Skip tools that already have descriptions"}
                </span>
              </label>
            )}

            <p className="text-xs text-muted-foreground">
              {isZh
                ? `将处理 ${toolsToProcess.length}/${toolIds.length} 个工具`
                : `${toolsToProcess.length}/${toolIds.length} tools will be processed`}
              {existingCount > 0
                ? isZh
                  ? `，其中 ${existingCount} 个已有描述`
                  : `, ${existingCount} already have descriptions`
                : ""}
            </p>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-2 py-2">
            {toolResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate">{result.id}</span>
                <span className="shrink-0">
                  {result.status === "pending" && (
                    <span className="text-muted-foreground">
                      {isZh ? "排队中" : "Pending"}
                    </span>
                  )}
                  {result.status === "loading" && (
                    <Loader2Icon className="size-4 animate-spin text-primary" />
                  )}
                  {result.status === "success" && (
                    <CheckCircleIcon className="size-4 text-green-600" />
                  )}
                  {result.status === "error" && (
                    <XCircleIcon className="size-4 text-destructive" />
                  )}
                </span>
                {result.status === "error" && result.error && (
                  <span className="ml-auto truncate pl-2 text-xs text-destructive">
                    {result.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-1 py-2 text-sm text-muted-foreground">
            <div>
              {isZh ? "成功" : "Success"}: {successCount}
            </div>
            <div>
              {isZh ? "失败" : "Failed"}: {errorCount}
            </div>
            {successCount === 0 && errorCount === 0 && (
              <div>{isZh ? "没有需要处理的工具" : "Nothing to process"}</div>
            )}
          </div>
        )}

        <DialogFooter>
          {phase === "select" ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                {isZh ? "取消" : "Cancel"}
              </Button>
              <Button
                size="sm"
                disabled={toolsToProcess.length === 0 || !selectedModel}
                onClick={async () => {
                  const controller = new AbortController();
                  abortControllerRef.current = controller;
                  resultsRef.current = {};
                  const pendingResults = toolsToProcess.map((id) => ({
                    id,
                    status: "pending" as const,
                  }));
                  setPhase("running");
                  setToolResults(pendingResults);
                  for (let index = 0; index < toolsToProcess.length; index += 1) {
                    const toolId = toolsToProcess[index]!;
                    setToolResults((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, status: "loading" }
                          : item,
                      ),
                    );
                    try {
                      const description = await describeCliTool(toolId, {
                        providerId: selectedProviderId,
                        model: selectedModel,
                      });
                      if (controller.signal.aborted) {
                        break;
                      }
                      resultsRef.current[toolId] = description;
                      setToolResults((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, status: "success" }
                            : item,
                        ),
                      );
                    } catch (error) {
                      if (controller.signal.aborted) {
                        break;
                      }
                      setToolResults((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                status: "error",
                                error:
                                  error instanceof Error
                                    ? error.message
                                    : "Failed",
                              }
                            : item,
                        ),
                      );
                    }
                  }
                  if (!controller.signal.aborted && Object.keys(resultsRef.current).length > 0) {
                    onComplete(resultsRef.current);
                  }
                  if (!controller.signal.aborted) {
                    setPhase("done");
                  }
                }}
              >
                {isZh ? "开始生成" : "Start"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => onOpenChange(false)}>
              {isZh ? "关闭" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
