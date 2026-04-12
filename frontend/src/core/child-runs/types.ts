export type ChildRunStatus =
  | "created"
  | "running"
  | "completed"
  | "failed"
  | "closed";

export type ChildRunRecord = {
  child_run_id: string;
  agent_name: string;
  title: string;
  status: ChildRunStatus;
  description: string;
  result?: string;
  error?: string;
  latest_message?: string;
  messages?: Array<{
    role: "human" | "ai" | "tool";
    content: string;
    created_at: string;
  }>;
};
