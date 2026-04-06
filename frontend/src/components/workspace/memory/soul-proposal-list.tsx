"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAcceptSoulProposal,
  useRejectSoulProposal,
  useSoulProposals,
} from "@/core/soul/hooks";

export function SoulProposalList() {
  const { proposals } = useSoulProposals();
  const accept = useAcceptSoulProposal();
  const reject = useRejectSoulProposal();

  async function handleAccept(memoryId: string) {
    try {
      await accept.mutateAsync(memoryId);
      toast.success("已接受灵魂提案");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "接受失败");
    }
  }

  async function handleReject(memoryId: string) {
    try {
      await reject.mutateAsync(memoryId);
      toast.success("已拒绝灵魂提案");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "拒绝失败");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>灵魂提案</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {proposals.length === 0 ? (
          <p className="text-muted-foreground">当前还没有灵魂提案。</p>
        ) : (
          proposals.map((proposal) => (
            <article key={proposal.memory_id} className="rounded-lg border p-4">
              <div className="font-medium">{proposal.title ?? "未命名提案"}</div>
              <p className="mt-2 text-muted-foreground">为什么产生：{proposal.summary}</p>
              <p className="mt-2 text-muted-foreground">会改变什么：影响后续陪伴和服务表达方式。</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void handleAccept(proposal.memory_id)}>
                  接受
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleReject(proposal.memory_id)}>
                  拒绝
                </Button>
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
