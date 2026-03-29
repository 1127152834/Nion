"use client";

import { ArrowUpRightIcon, PlusIcon, SparklesIcon, TerminalIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CliToolsManager } from "@/components/workspace/cli-tools";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfNewThread } from "@/core/navigation/desktop-routes";

export default function CliToolsPage() {
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";
  const router = useRouter();

  const addToolPrefill = isZh
    ? "我想安装一个新的 CLI 工具并添加到工具库。\n工具名称：\n安装命令（如 brew install xxx）："
    : "I want to install a new CLI tool and add it to my tool library.\nTool name:\nInstall command (e.g. brew install xxx):";

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <CliToolsManager
          title={isZh ? "CLI 工具" : "CLI Tools"}
          description={
            isZh
              ? "管理本机 CLI 工具，让 Nion 在对话中识别、安装、更新并使用它们。"
              : "Manage local CLI tools so Nion can discover, install, update, and use them in chat."
          }
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => router.push(pathOfNewThread({ draft: addToolPrefill }))}
            >
              <PlusIcon className="size-4" />
              {isZh ? "添加工具" : "Add Tool"}
            </Button>
          }
          installedActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push(pathOfNewThread({ draft: addToolPrefill }))}
              >
                <PlusIcon className="size-4" />
                {isZh ? "添加工具" : "Add Tool"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("nion-open-cli-tool-add"));
                }}
              >
                <TerminalIcon className="size-4" />
                {isZh ? "按路径添加" : "Add by Path"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("nion-open-cli-batch-describe"));
                }}
              >
                <SparklesIcon className="size-4" />
                {isZh ? "AI 批量描述" : "AI Describe"}
              </Button>
            </div>
          }
        />
        <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
          <ArrowUpRightIcon className="size-3.5" />
          <a
            href={
              isZh
                ? "https://www.codepilot.sh/zh/docs"
                : "https://www.codepilot.sh/docs"
            }
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground hover:underline"
          >
            {isZh ? "查看 CodePilot 文档" : "View CodePilot docs"}
          </a>
        </div>
      </div>
    </div>
  );
}
