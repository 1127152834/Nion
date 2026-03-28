export type AgentConfigKey = "codex" | "claude_code";
export type ConfigDraft = Record<string, unknown>;

function cloneConfig<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function formatArgs(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((item) => asString(item).trim())
    .filter((item) => item.length > 0)
    .join("\n");
}

export function parseArgs(raw: string): string[] {
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function formatEnv(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  return Object.entries(value as Record<string, unknown>)
    .map(([key, rawValue]) => `${key}=${asString(rawValue)}`)
    .join("\n");
}

export function parseEnv(raw: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key) {
      env[key] = value;
    }
  }
  return env;
}

export function getAgentConfig(
  config: ConfigDraft,
  agentKey: AgentConfigKey,
): Record<string, unknown> {
  return asObject(asObject(config.acp_agents)[agentKey]);
}

export function setAgentConfig(
  config: ConfigDraft,
  agentKey: AgentConfigKey,
  nextValue: Record<string, unknown> | null,
): ConfigDraft {
  const next = cloneConfig(config);
  const agents = asObject(next.acp_agents);
  if (nextValue == null) {
    delete agents[agentKey];
  } else {
    agents[agentKey] = nextValue;
  }
  if (Object.keys(agents).length === 0) {
    delete next.acp_agents;
  } else {
    next.acp_agents = agents;
  }
  return next;
}
