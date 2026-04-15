"use client";

import { Button } from "@/components/ui/button";

export type RetrievalLocalPackItem = {
  pack_id: string;
  display_name: string;
  locale: string;
  installed_count: number;
  total_count: number;
  installed: boolean;
  downloading: boolean;
};

export interface RetrievalLocalPacksCardProps {
  packs: RetrievalLocalPackItem[];
  progressMessage: string | null;
  busy: boolean;
  onDownloadPack: (packId: string) => void;
  onImportPack: (packId: string) => void;
}

export function RetrievalLocalPacksCard({
  packs,
  progressMessage,
  busy,
  onDownloadPack,
  onImportPack,
}: RetrievalLocalPacksCardProps) {
  if (packs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="space-y-1">
        <div className="text-sm font-medium">本地模型包</div>
        <div className="text-muted-foreground text-sm">
          下载后可在本地模型模式中选择，不需要 API Key。
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {packs.map((pack) => (
          <div
            key={pack.pack_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3"
          >
            <div className="space-y-1">
              <div className="text-sm font-medium">{pack.display_name}</div>
              <div className="text-muted-foreground text-xs">
                {pack.locale} · {pack.installed_count}/{pack.total_count} 已就绪
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDownloadPack(pack.pack_id)}
                disabled={busy || pack.installed || pack.downloading}
              >
                {pack.downloading ? "下载中" : pack.installed ? "已下载" : "下载"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onImportPack(pack.pack_id)}
                disabled={busy}
              >
                导入
              </Button>
            </div>
          </div>
        ))}
      </div>

      {progressMessage ? (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          {progressMessage}
        </div>
      ) : null}
    </section>
  );
}
