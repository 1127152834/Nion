export interface ToolPolicyRule {
  allowed_groups?: string[] | null;
  denied_groups: string[];
  allowed_tools?: string[] | null;
  denied_tools: string[];
}

export interface ToolCatalogEntry {
  name: string;
  group: string;
  source: string;
  policy_managed: boolean;
}

export interface ToolPolicyResponse {
  scope: string;
  rules: Record<string, ToolPolicyRule>;
  catalog: ToolCatalogEntry[];
}
