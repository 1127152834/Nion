"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationRunThreadPreview } from "@/core/automation/hooks";
import type { AutomationRunPreview as AutomationRunPreviewModel } from "@/core/automation/presentation";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfThread } from "@/core/threads/utils";

type AutomationRunPreviewProps = {
  run: AutomationRunPreviewModel;
};

export function AutomationRunPreview({ run }: AutomationRunPreviewProps) {
  const { locale, t } = useI18n();
  const isZh = locale === "zh-CN";
  const { threadPreview, isLoading, error } = useAutomationRunThreadPreview(run.threadId);

  if (!run.threadId) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{isZh ? "线程预览" : "Thread preview"}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {isZh ? "这次运行没有关联独立线程，仅保留结果摘要。" : "This run has no isolated thread. Only the result summary is available."}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{isZh ? "线程预览" : "Thread preview"}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {t.common.loading}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{isZh ? "线程预览" : "Thread preview"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-red-500">
          {error instanceof Error ? error.message : String(error)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <CardTitle>{threadPreview?.title ?? run.jobName}</CardTitle>
        <div className="text-muted-foreground text-xs">
          {run.threadId}
          {threadPreview?.updatedAt ? ` · ${threadPreview.updatedAt}` : ""}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-3 text-sm">
          {run.summary || (isZh ? "暂无摘要。" : "No summary yet.")}
        </div>
        <Link
          className="inline-flex text-sm font-medium underline-offset-4 hover:underline"
          href={pathOfThread(run.threadId)}
        >
          {isZh ? "打开完整线程" : "Open full thread"}
        </Link>
        {(threadPreview?.messages.length ?? 0) === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
            {isZh ? "线程里还没有可预览的消息内容。" : "No previewable messages in this thread yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {threadPreview!.messages.map((message, index) => (
              <div key={`${message.type}-${index}`} className="rounded-xl border p-3">
                <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                  {labelOfMessageType(message.type, isZh)}
                </div>
                <div className="text-sm whitespace-pre-wrap">{message.text}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function labelOfMessageType(type: string, isZh: boolean) {
  if (type === "human") {
    return isZh ? "用户" : "User";
  }
  if (type === "ai") {
    return isZh ? "助手" : "Assistant";
  }
  if (type === "tool") {
    return isZh ? "工具" : "Tool";
  }
  return isZh ? "记录" : "Record";
}
