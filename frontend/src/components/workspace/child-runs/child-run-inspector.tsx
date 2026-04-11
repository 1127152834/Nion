"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChildRun } from "@/core/child-runs/hooks";
import type { ChildRunRecord } from "@/core/child-runs/types";

export function ChildRunInspector({
  open,
  threadId,
  childRun,
  onOpenChange,
}: {
  open: boolean;
  threadId: string | null;
  childRun: ChildRunRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = useChildRun(threadId, childRun?.child_run_id ?? null);
  const inspected = data ?? childRun;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{inspected?.title ?? "子智能体会话"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">状态</div>
            <div>{inspected?.status ?? "unknown"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">说明</div>
            <div>{inspected?.description ?? "暂无说明"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">最新消息</div>
            <div>{inspected?.latest_message ?? "暂无消息"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">结果</div>
            <div>{inspected?.result ?? inspected?.error ?? "暂无结果"}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
