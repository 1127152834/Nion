"use client";

import { ArrowUpRightIcon, ChevronDownIcon, CopyIcon, PlayIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CliToolDefinition, CliToolPlatform } from "@/core/cli";
import { pathOfNewThread } from "@/core/navigation/desktop-routes";

type CliToolDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: CliToolDefinition;
  locale: string;
  onInstall?: (tool: CliToolDefinition, method: string) => void;
  platform?: string;
};

export function CliToolDetailDialog({
  open,
  onOpenChange,
  tool,
  locale,
  onInstall,
  platform,
}: CliToolDetailDialogProps) {
  const router = useRouter();
  const isZh = locale === "zh-CN";
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  const availableMethods = platform
    ? tool.installMethods.filter((item) =>
        item.platforms.includes(platform as CliToolPlatform),
      )
    : tool.installMethods;

  const copyText = (value: string) => navigator.clipboard.writeText(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tool.name}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          <section>
            <h3 className="mb-2 text-sm font-medium">
              {isZh ? "工具简介" : "Intro"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isZh ? tool.detailIntro.zh : tool.detailIntro.en}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium">
              {isZh ? "适用场景" : "Use cases"}
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {(isZh ? tool.useCases.zh : tool.useCases.en).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium">
              {isZh ? "快速上手" : "Guide steps"}
            </h3>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              {(isZh ? tool.guideSteps.zh : tool.guideSteps.en).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium">
              {isZh ? "示例提示词" : "Example prompts"}
            </h3>
            <div className="space-y-2">
              {tool.examplePrompts.map((prompt) => (
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
                        copyText(isZh ? prompt.promptZh : prompt.promptEn)
                      }
                    >
                      <CopyIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {(tool.homepage || tool.repoUrl || tool.officialDocsUrl) && (
            <section className="flex flex-wrap gap-2 border-t pt-2 text-xs">
              {tool.homepage && (
                <a
                  href={tool.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ArrowUpRightIcon className="size-3.5" />
                  {isZh ? "主页" : "Homepage"}
                </a>
              )}
              {tool.repoUrl && (
                <a
                  href={tool.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ArrowUpRightIcon className="size-3.5" />
                  GitHub
                </a>
              )}
              {tool.officialDocsUrl && (
                <a
                  href={tool.officialDocsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ArrowUpRightIcon className="size-3.5" />
                  {isZh ? "文档" : "Docs"}
                </a>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          {!onInstall ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const prefill = isZh
                  ? `我想用 ${tool.name} 工具完成：`
                  : `I want to use ${tool.name} to: `;
                router.push(pathOfNewThread({ draft: prefill }));
                onOpenChange(false);
              }}
            >
              <PlayIcon className="size-4" />
              {isZh ? "试一试" : "Try It"}
            </Button>
          ) : (
            <div />
          )}
          {onInstall && availableMethods.length > 0 && (
            <div className="relative">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (availableMethods.length === 1) {
                    onInstall(tool, availableMethods[0]!.method);
                    return;
                  }
                  setShowMethodPicker((value) => !value);
                }}
              >
                <PlusIcon className="size-4" />
                {isZh ? "安装" : "Install"}
                {availableMethods.length > 1 && <ChevronDownIcon className="size-4" />}
              </Button>
              {showMethodPicker && availableMethods.length > 1 && (
                <div className="absolute bottom-10 right-0 z-20 min-w-[180px] rounded-md border bg-popover p-1 shadow-md">
                  {availableMethods.map((method) => (
                    <Button
                      key={method.method}
                      variant="ghost"
                      size="sm"
                      className="h-auto w-full justify-start px-2 py-1 text-xs"
                      onClick={() => {
                        setShowMethodPicker(false);
                        onInstall(tool, method.method);
                      }}
                    >
                      {method.method}: {method.command}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
