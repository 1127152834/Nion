import { ActivityIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import {
  QueueItem,
  QueueItemContent,
  QueueItemIndicator,
  QueueList,
} from "../../ai-elements/queue";

type ToolActivityItem = {
  summary_label?: string;
  result_class?: string;
  tool_names?: string[];
};

export function ToolActivityTimeline({
  className,
  timeline,
  hidden = false,
}: {
  className?: string;
  timeline: ToolActivityItem[];
  hidden?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div
      className={cn(
        "flex h-fit w-full origin-bottom translate-y-4 flex-col overflow-hidden rounded-t-xl border border-b-0 bg-white backdrop-blur-sm transition-all duration-200 ease-out",
        hidden ? "pointer-events-none translate-y-8 opacity-0" : "",
        className,
      )}
    >
      <header
        className="bg-accent flex min-h-8 shrink-0 cursor-pointer items-center justify-between px-4 text-sm transition-all duration-300 ease-out"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <div className="text-muted-foreground flex items-center justify-center gap-2">
          <ActivityIcon className="size-4" />
          <div>Tool Activity</div>
        </div>
        <div className="text-muted-foreground text-xs">
          {timeline.length} entries
        </div>
      </header>
      <main
        className={cn(
          "bg-accent flex grow px-2 transition-all duration-300 ease-out",
          collapsed ? "h-0 pb-3" : "h-28 pb-4",
        )}
      >
        <QueueList className="bg-background mt-0 w-full rounded-t-xl">
          {timeline.map((item, index) => (
            <QueueItem key={`${item.summary_label ?? "activity"}-${index}`}>
              <div className="flex items-center gap-2">
                <QueueItemIndicator />
                <QueueItemContent>
                  {item.summary_label ?? "Completed tool batch"}
                </QueueItemContent>
              </div>
            </QueueItem>
          ))}
        </QueueList>
      </main>
    </div>
  );
}
