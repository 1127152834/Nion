export function DelegationSummary({ count }: { count: number }) {
  return (
    <div className="text-muted-foreground rounded-lg border px-3 py-2 text-sm">
      已调度 {count} 个子智能体。详细过程请在左侧会话列表中展开查看。
    </div>
  );
}
