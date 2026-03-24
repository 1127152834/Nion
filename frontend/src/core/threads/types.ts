import type { Message, Thread } from "@langchain/langgraph-sdk";

import type { Todo } from "../todos";

export interface AgentThreadState extends Record<string, unknown> {
  title: string;
  messages: Message[];
  artifacts: string[];
  todos?: Todo[];
}

export interface AgentThread extends Thread<AgentThreadState> {}

export interface AgentThreadContext extends Record<string, unknown> {
  thread_id: string;
  model_name: string | undefined;
  thinking_enabled: boolean;
  is_plan_mode: boolean;
  subagent_enabled: boolean;
  reasoning_effort?: "minimal" | "low" | "medium" | "high";
  agent_name?: string;
  execution_mode?: "sandbox" | "host";
  host_workdir?: string;
  requested_skills?: string[];
  selected_contexts?: Array<{ value: string; kind: "file" | "directory" }>;
  selected_mcp_tools?: string[];
  selected_cli_tools?: string[];
  implicit_mentions?: Array<{
    kind: "context" | "skill" | "mcp" | "cli";
    value: string;
    mention: string;
  }>;
}
