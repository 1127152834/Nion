"use client";

import Link from "next/link";
import { HistoryIcon, Layers2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useApplyObjectCandidate, useDeferObjectCandidate, useDismissObjectCandidate, useObjectCandidates } from "@/core/object-candidates/hooks";
import { pathOfObjectCandidate } from "@/core/navigation/desktop-routes";

export function CandidateCenterDrawer() {
  const { data } = useObjectCandidates();
  const applyCandidate = useApplyObjectCandidate();
  const dismissCandidate = useDismissObjectCandidate();
  const deferCandidate = useDeferObjectCandidate();
  const items = data?.items ?? [];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" className="fixed top-3 right-4 z-40">
          <Layers2Icon className="size-4" />
          候选中心
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] overflow-y-auto sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>候选中心</SheetTitle>
          <SheetDescription>集中处理 ready 状态的对象桥接候选。</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
              当前没有待处理候选。
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="space-y-3 rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{item.title}</div>
                      <Badge variant="outline">{item.candidate_type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{item.summary}</div>
                  </div>
                  <Badge>{item.status}</Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>source_summary: 由候选详情页提供来源摘要</div>
                  <div>target_summary: 由候选详情页提供目标摘要</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => applyCandidate.mutate(item.id)}
                    disabled={!item.available_actions.includes("apply")}
                  >
                    应用
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      dismissCandidate.mutate({
                        candidateId: item.id,
                        input: { reason: "dismissed_in_drawer" },
                      })
                    }
                    disabled={!item.available_actions.includes("dismiss")}
                  >
                    拒绝
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      deferCandidate.mutate({
                        candidateId: item.id,
                        input: {
                          deferred_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                          reason: "defer_from_drawer",
                        },
                      })
                    }
                    disabled={!item.available_actions.includes("defer")}
                  >
                    稍后处理
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={pathOfObjectCandidate(item.id)}>
                      <HistoryIcon className="size-4" />
                      查看详情
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
