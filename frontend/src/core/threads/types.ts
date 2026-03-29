import type { Todo } from "../todos";

export type ToolCall = {
  id?: string;
  name: string;
  args: Record<string, unknown> & {
    query?: string;
    description?: string;
    prompt?: string;
    subagent_type?: string;
    content?: string;
    filepaths?: string[];
  };
};

type UnknownMessageContentPart = {
  type: string;
  text?: string;
  image_url?: string | { url: string };
  thinking?: string;
  [key: string]: unknown;
};

export type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: string | { url: string } }
  | { type: "thinking"; thinking?: string; text?: string }
  | UnknownMessageContentPart;

export interface Message {
  type: "human" | "ai" | "tool";
  id?: string;
  content: string | MessageContentPart[];
  additional_kwargs?: Record<string, unknown>;
  tool_calls?: ToolCall[];
  name?: string;
  tool_call_id?: string;
}

export interface AIMessage extends Message {
  type: "ai";
  tool_calls?: ToolCall[];
}

export interface AgentThreadState extends Record<string, unknown> {
  title: string;
  messages: Message[];
  artifacts: string[];
  todos?: Todo[];
  resolved_permission_request_ids?: string[];
  bridge?: {
    source: "bridge";
    platform: string;
    label?: string;
    chatId?: string;
  };
}

export interface Thread<TState extends Record<string, unknown>> {
  thread_id: string;
  created_at?: string;
  updated_at?: string;
  values: TState;
}

export interface ThreadSubmitPayload {
  messages: Array<{
    type: "human";
    content: Array<{ type: "text"; text: string }> | string;
    additional_kwargs?: Record<string, unknown>;
  }>;
}

export type PermissionReplayPayload = {
  text: string;
  files: Array<{
    filename: string;
    path?: string;
    size?: number;
    status?: string;
  }>;
  additional_kwargs?: Record<string, unknown>;
};

export interface ThreadSubmitOptions {
  threadId: string;
  streamSubgraphs?: boolean;
  streamResumable?: boolean;
  config?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface BaseStream<TState extends Record<string, unknown>> {
  threadId?: string | null;
  messages: Message[];
  values: TState;
  error: unknown;
  isLoading: boolean;
  isThreadLoading: boolean;
  stop(): Promise<void>;
  submit(payload: ThreadSubmitPayload, options: ThreadSubmitOptions): Promise<void>;
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

export type PendingPermissionRequest = {
  toolMessageId?: string;
  toolCallId?: string;
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  options: string[];
  actions: Array<{
    key: "allow" | "allow_session" | "deny";
    label: string;
  }>;
  reasonCode?: string;
  reasonMessage?: string;
};
