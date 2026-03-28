"use client";

import { CopyIcon, PlayIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CliToolDescriptionRecord, CliToolRuntimeInfo } from "@/core/cli";
import { pathOfNewThread } from "@/core/navigation/desktop-routes";

type CliToolExtraDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  runtimeInfo: CliToolRuntimeInfo;
  autoDescription?: CliToolDescriptionRecord;
  locale: string;
  binPath?: string;
};

export function CliToolExtraDetailDialog({
  open,
  onOpenChange,
  displayName,
  runtimeInfo,
  autoDescription,
  locale,
  binPath,
}: CliToolExtraDetailDialogProps) {
  const router = useRouter();
  const isZh = locale === "zh-CN";
  const structured = autoDescription?.structured;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{displayName}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          {autoDescription && (
            <section>
              <h3 className="mb-2 text-sm font-medium">
                {isZh ? "工具简介" : "Intro"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {structured
                  ? isZh
                    ? structured.intro.zh
                    : structured.intro.en
                  : isZh
                    ? autoDescription.zh
                    : autoDescription.en}
              </p>
            </section>
          )}

          {structured?.useCases && (
            <section>
              <h3 className="mb-2 text-sm font-medium">
                {isZh ? "适用场景" : "Use cases"}
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {(isZh ? structured.useCases.zh : structured.useCases.en).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {structured?.guideSteps && (
            <section>
              <h3 className="mb-2 text-sm font-medium">
                {isZh ? "快速上手" : "Guide steps"}
              </h3>
              <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                {(isZh ? structured.guideSteps.zh : structured.guideSteps.en).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
          )}

          {structured?.examplePrompts && structured.examplePrompts.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium">
                {isZh ? "示例提示词" : "Example prompts"}
              </h3>
              <div className="space-y-2">
                {structured.examplePrompts.map((prompt) => (
                  <div key={prompt.label} className="rounded-md border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-xs font-medium">{prompt.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {isZh ? prompt.promptZh : prompt.promptEn}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            isZh ? prompt.promptZh : prompt.promptEn,
                          )
                        }
                      >
                        <CopyIcon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-medium">
              {isZh ? "工具信息" : "Tool info"}
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              {runtimeInfo.version && (
                <div className="flex gap-2">
                  <span className="text-foreground/70">
                    {isZh ? "版本" : "Version"}:
                  </span>
                  <span>{runtimeInfo.version}</span>
                </div>
              )}
              {(runtimeInfo.binPath || binPath) && (
                <div className="flex gap-2">
                  <span className="shrink-0 text-foreground/70">
                    {isZh ? "路径" : "Path"}:
                  </span>
                  <span className="break-all font-mono text-xs">
                    {runtimeInfo.binPath || binPath}
                  </span>
                </div>
              )}
            </div>
          </section>

          {!autoDescription && (
            <p className="text-sm italic text-muted-foreground">
              {isZh ? "还没有 AI 描述。" : "No AI description yet."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const prefill = isZh
                ? `我想用 ${displayName} 工具完成：`
                : `I want to use ${displayName} to: `;
              router.push(pathOfNewThread({ draft: prefill }));
              onOpenChange(false);
            }}
          >
            <PlayIcon className="size-4" />
            {isZh ? "试一试" : "Try It"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
