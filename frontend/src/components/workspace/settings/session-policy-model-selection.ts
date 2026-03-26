type ConfigDraft = Record<string, unknown>;

export const DEFAULT_POLICY_MODEL_VALUE = "__default_model__";

const POLICY_MODEL_SECTIONS = [
  "suggestions",
  "title",
  "summarization",
] as const;

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {})) as T;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeModelNames(availableModelNames: Iterable<string>): Set<string> {
  return new Set(
    [...availableModelNames]
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

export function normalizePolicyModelName(
  value: string,
  availableModelNames: Iterable<string>,
): string {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return "";
  }
  const available = normalizeModelNames(availableModelNames);
  return available.has(normalizedValue) ? normalizedValue : "";
}

export function getPolicyModelSelectValue(
  value: string,
  availableModelNames: Iterable<string>,
): string {
  const normalized = normalizePolicyModelName(value, availableModelNames);
  return normalized || DEFAULT_POLICY_MODEL_VALUE;
}

export function normalizeSessionPolicyConfig(
  config: ConfigDraft,
  availableModelNames: Iterable<string>,
): ConfigDraft {
  const available = normalizeModelNames(availableModelNames);
  if (available.size === 0) {
    return cloneConfig(config);
  }

  const next = cloneConfig(config);
  for (const sectionName of POLICY_MODEL_SECTIONS) {
    const section = asObject(next[sectionName]);
    if (Object.keys(section).length === 0) {
      continue;
    }
    const normalizedModelName = normalizePolicyModelName(
      typeof section.model_name === "string" ? section.model_name : "",
      available,
    );
    if (normalizedModelName) {
      section.model_name = normalizedModelName;
    } else {
      delete section.model_name;
    }
    if (Object.keys(section).length === 0) {
      delete next[sectionName];
    } else {
      next[sectionName] = section;
    }
  }
  return next;
}
