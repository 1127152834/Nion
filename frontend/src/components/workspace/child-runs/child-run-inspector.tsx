import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChildRun } from "@/core/child-runs/hooks";
import type { ChildRunRecord } from "@/core/child-runs/types";

export function ChildRunInspector({
  open,
  threadId,
  childRunId,
  childRunPreview,
  onOpenChange,
}: {
  open: boolean;
  threadId: string | null;
  childRunId: string | null;
  childRunPreview: ChildRunRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: childRun } = useChildRun(threadId, childRunId);
  const resolved = childRun ?? childRunPreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{resolved?.title ?? "子智能体会话"}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-auto">
          <div className="rounded-lg border p-3 text-xs">
            <div className="font-medium">状态：{resolved?.status ?? "unknown"}</div>
            <div className="text-muted-foreground mt-1">
              {resolved?.description ?? ""}
            </div>
            {resolved?.result ? (
              <div className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-2">
                {resolved.result}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            {(resolved?.messages ?? []).map((message, index) => (
              <div
                key={`${message.created_at}-${index}`}
                className="rounded-lg border p-3 text-xs"
              >
                <div className="font-medium">{message.role}</div>
                <div className="text-muted-foreground mt-1 whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
