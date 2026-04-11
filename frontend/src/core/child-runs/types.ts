export type ChildRunStatus =
  | "created"
  | "running"
  | "completed"
  | "failed"
  | "closed";

export type ChildRunRecord = {
  child_run_id: string;
  parent_thread_id?: string;
  agent_name: string;
  title: string;
  status: ChildRunStatus;
  description: string;
  result?: string | null;
  error?: string | null;
  latest_message?: string;
  started_at?: string;
  finished_at?: string | null;
  messages?: Array<{
    role: "human" | "ai" | "tool";
    content: string;
    created_at: string;
  }>;
  tool_activity_timeline?: Array<Record<string, unknown>>;
  artifacts?: string[];
};
