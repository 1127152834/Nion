export interface Agent {
  name: string;
  description: string;
  model: string | null;
  tool_groups: string[] | null;
  id: string;
  slug: string;
  kind: "builtin" | "custom";
  visibility: "public" | "internal";
  can_delete: boolean;
  can_edit: boolean;
  entrypoint: string | null;
  tool_policy: string | null;
  soul?: string | null;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  model?: string | null;
  tool_groups?: string[] | null;
  soul?: string;
}

export interface UpdateAgentRequest {
  description?: string | null;
  model?: string | null;
  tool_groups?: string[] | null;
  soul?: string | null;
}
