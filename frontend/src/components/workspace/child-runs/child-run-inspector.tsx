import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChildRunRecord } from "@/core/child-runs/types";

export function ChildRunInspector({
  open,
  childRun,
  onOpenChange,
}: {
  open: boolean;
  childRun: ChildRunRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{childRun?.title ?? "子智能体会话"}</DialogTitle>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-lg border p-4 text-xs">
          {JSON.stringify(childRun, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
