export type DesktopLocalActionPlan = {
  actions: Array<{
    action_type: string;
  }>;
};

export type DesktopLocalActionExecutionResult = {
  executed: Array<{
    action_type: string;
    status: "skipped";
    result_summary: string;
  }>;
};

export class LocalActionsExecutor {
  async executePlan(
    plan: DesktopLocalActionPlan,
  ): Promise<DesktopLocalActionExecutionResult> {
    return {
      executed: plan.actions.map((action) => ({
        action_type: action.action_type,
        status: "skipped",
        result_summary: "Execution stub not implemented yet",
      })),
    };
  }
}
