"use client";

import { DownloadIcon, FileIcon, GlobeIcon, ImageIcon } from "lucide-react";

import type { NotebookAsset } from "@/core/notebook";
import { downloadAsFile } from "@/core/threads/export";

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

  const resolvedAsset = asset;
  const isHtml = resolvedAsset.mime_type === "text/html";
  const isImage = resolvedAsset.mime_type?.startsWith("image/");
  const createdAt = new Date(resolvedAsset.created_at).toLocaleString("zh-CN");
  const updatedAt = new Date(resolvedAsset.updated_at).toLocaleString("zh-CN");
  const fileSize = resolvedAsset.file_size ? `${resolvedAsset.file_size} B` : "未知大小";

  async function handleDownload() {
    if (isHtml || isImage) {
      const response = await fetch(`file://${resolvedAsset.absolute_path}`);
      const content = await response.text();
      downloadAsFile(content, resolvedAsset.title, resolvedAsset.mime_type || "application/octet-stream");
      return;
    }
    downloadAsFile(resolvedAsset.absolute_path, resolvedAsset.title, "text/plain;charset=utf-8");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--notebook-border)] bg-[var(--notebook-panel)]">
      <div className="border-b border-[var(--notebook-border)] px-5 py-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--notebook-soft-text)]">
            {isHtml ? (
              <GlobeIcon className="size-3.5" />
            ) : isImage ? (
              <ImageIcon className="size-3.5" />
            ) : (
              <FileIcon className="size-3.5" />
            )}
            <span>{resolvedAsset.mime_type || "application/octet-stream"}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="flex items-center gap-1 rounded-md border border-[var(--notebook-border)] px-2 py-1 text-xs text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
          >
            <DownloadIcon className="size-3.5" />
            <span>下载</span>
          </button>
        </div>
        <h2 className="truncate text-xl font-semibold text-[var(--notebook-ink)]">
          {resolvedAsset.title}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[var(--notebook-soft-text)]">
          <div>
            <div className="mb-1">路径</div>
            <div className="truncate text-[var(--notebook-ink)]">{resolvedAsset.relative_path}</div>
          </div>
          <div>
            <div className="mb-1">来源</div>
            <div className="text-[var(--notebook-ink)]">{resolvedAsset.source_kind}</div>
          </div>
          <div>
            <div className="mb-1">创建时间</div>
            <div className="text-[var(--notebook-ink)]">{createdAt}</div>
          </div>
          <div>
            <div className="mb-1">更新时间</div>
            <div className="text-[var(--notebook-ink)]">{updatedAt}</div>
          </div>
          <div>
            <div className="mb-1">大小</div>
            <div className="text-[var(--notebook-ink)]">{fileSize}</div>
          </div>
          <div>
            <div className="mb-1">绝对路径</div>
            <div className="truncate text-[var(--notebook-ink)]">{resolvedAsset.absolute_path}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-[var(--notebook-shell)]">
        {isHtml ? (
          <iframe
            className="h-full w-full"
            title={resolvedAsset.title}
            srcDoc={`<base href="file://${resolvedAsset.absolute_path}" />`}
          />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={resolvedAsset.title}
            className="h-full w-full object-contain"
            src={`file://${resolvedAsset.absolute_path}`}
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
