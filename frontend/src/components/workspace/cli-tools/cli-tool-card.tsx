"use client";

import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  CliToolDefinition,
  CliToolPlatform,
  CliToolRuntimeInfo,
} from "@/core/cli";

type CliToolCardProps = {
  tool: CliToolDefinition;
  runtimeInfo?: CliToolRuntimeInfo;
  variant: "installed" | "recommended";
  autoDescription?: { zh: string; en: string };
  onDetail: () => void;
  onInstall?: (tool: CliToolDefinition, method: string) => void;
  locale: string;
  platform: string;
};

const CATEGORY_LABELS: Record<string, { en: string; zh: string }> = {
  media: { en: "Media", zh: "媒体" },
  data: { en: "Data", zh: "数据" },
  search: { en: "Search", zh: "搜索" },
  download: { en: "Download", zh: "下载" },
  document: { en: "Document", zh: "文档" },
  productivity: { en: "Productivity", zh: "效率" },
};

export function CliToolCard({
  tool,
  runtimeInfo,
  variant,
  autoDescription,
  onDetail,
  onInstall,
  locale,
  platform,
}: CliToolCardProps) {
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const isZh = locale === "zh-CN";

  const availableMethods = useMemo(
    () =>
      tool.installMethods.filter((item) =>
        item.platforms.includes(platform as CliToolPlatform),
      ),
    [platform, tool.installMethods],
  );

  const summary = autoDescription
    ? isZh
      ? autoDescription.zh
      : autoDescription.en
    : isZh
      ? tool.summaryZh
      : tool.summaryEn;

  const handleInstallClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (availableMethods.length === 1) {
      onInstall?.(tool, availableMethods[0]!.method);
      return;
    }
    if (availableMethods.length > 1) {
      setShowMethodPicker((value) => !value);
    }
  };

  return (
    <div
      className="relative flex cursor-pointer items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 transition-colors hover:bg-muted/50"
      onClick={onDetail}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium">{tool.name}</h3>
          {tool.categories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {isZh
                ? CATEGORY_LABELS[category]?.zh ?? category
                : CATEGORY_LABELS[category]?.en ?? category}
            </span>
          ))}
          {variant === "installed" && runtimeInfo?.version && (
            <span className="shrink-0 text-xs text-muted-foreground">
              v{runtimeInfo.version}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {summary}
        </p>
      </div>

      {variant === "recommended" && onInstall && availableMethods.length > 0 && (
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleInstallClick}
            title={isZh ? "安装" : "Install"}
          >
            {availableMethods.length > 1 ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <PlusIcon className="size-4" />
            )}
          </Button>
          {showMethodPicker && availableMethods.length > 1 && (
            <div className="absolute right-0 top-8 z-20 min-w-[180px] rounded-md border bg-popover p-1 shadow-md">
              {availableMethods.map((method) => (
                <Button
                  key={method.method}
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-start px-2 py-1 text-xs"
                  onClick={(event) => {
                    event.stopPropagation();
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
    </div>
  );
}
