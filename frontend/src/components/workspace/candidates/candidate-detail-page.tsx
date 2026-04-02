"use client";

import { useObjectCandidate } from "@/core/object-candidates/hooks";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CandidateDetailPage({ candidateId }: { candidateId: string }) {
  const { data, isLoading } = useObjectCandidate(candidateId);

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>候选详情</CardTitle>
              <CardDescription>查看 provenance、guard_state、payload 和 action_history。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading || !data ? (
                <div className="text-sm text-muted-foreground">正在加载候选详情…</div>
              ) : (
                <>
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">来源链 / provenance</h3>
                    <pre className="overflow-x-auto rounded-xl border p-3 text-xs">{JSON.stringify(data.provenance, null, 2)}</pre>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">应用条件 / guard_state</h3>
                    <pre className="overflow-x-auto rounded-xl border p-3 text-xs">{JSON.stringify(data.guard_state, null, 2)}</pre>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">动作历史 / action_history</h3>
                    <pre className="overflow-x-auto rounded-xl border p-3 text-xs">{JSON.stringify(data.action_history, null, 2)}</pre>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">原始负载 / payload</h3>
                    <pre className="overflow-x-auto rounded-xl border p-3 text-xs">{JSON.stringify(data.candidate, null, 2)}</pre>
                  </section>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
