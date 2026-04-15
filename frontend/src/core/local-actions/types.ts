export type LocalActionsHistoryItem = {
  goal: {
    goal_id: string;
    user_input: string;
    status: string;
  };
  plan: {
    plan_id: string;
    risk_level: string;
    summary: string;
  };
  execution: {
    execution_id: string;
    approval_status: string;
    audit_summary: string;
    finished_at?: string | null;
    executed_actions?: Array<{
      action_type: string;
      status: string;
      result_summary: string;
    }>;
  };
};

export type LocalActionsHistoryResponse = {
  items: LocalActionsHistoryItem[];
};
