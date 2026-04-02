"use client";

import { FileIcon, GlobeIcon, ImageIcon } from "lucide-react";

import type { NotebookAsset } from "@/core/notebook";

type NotebookAssetViewProps = {
  asset: NotebookAsset | null;
  isLoading: boolean;
};

export function NotebookAssetView({
  asset,
  isLoading,
}: NotebookAssetViewProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[1.5rem] border border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-sm text-[var(--notebook-soft-text)]">
        正在加载工作产物…
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[1.5rem] border border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-sm text-[var(--notebook-soft-text)]">
        选择一个已保存的工作产物查看详情。
      </div>
    );
  }

  const isHtml = asset.mime_type === "text/html";
  const isImage = asset.mime_type?.startsWith("image/");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--notebook-border)] bg-[var(--notebook-panel)]">
      <div className="border-b border-[var(--notebook-border)] px-5 py-4">
        <div className="mb-1 flex items-center gap-2 text-xs text-[var(--notebook-soft-text)]">
          {isHtml ? (
            <GlobeIcon className="size-3.5" />
          ) : isImage ? (
            <ImageIcon className="size-3.5" />
          ) : (
            <FileIcon className="size-3.5" />
          )}
          <span>{asset.mime_type || "application/octet-stream"}</span>
        </div>
        <h2 className="truncate text-xl font-semibold text-[var(--notebook-ink)]">
          {asset.title}
        </h2>
        <div className="mt-2 space-y-1 text-xs text-[var(--notebook-soft-text)]">
          <div>{asset.relative_path}</div>
          <div>{asset.source_kind}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-[var(--notebook-shell)]">
        {isHtml ? (
          <iframe
            className="h-full w-full"
            title={asset.title}
            srcDoc={`<base href="file://${asset.absolute_path}" />`}
          />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={asset.title}
            className="h-full w-full object-contain"
            src={`file://${asset.absolute_path}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-sm text-[var(--notebook-soft-text)]">
            当前资产类型暂不提供内嵌预览。
          </div>
        )}
      </div>
    </div>
  );
}
