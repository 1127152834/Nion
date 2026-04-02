import type { AgentThreadContext } from "../threads";
import type { WorkspaceThreadType } from "../threads/history-tabs";

export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  notification: {
    enabled: true,
  },
  context: {
    model_name: undefined,
    model_name_manually_selected: false,
    mode: undefined,
    reasoning_effort: undefined,
  },
  layout: {
    sidebar_collapsed: false,
    recent_chat_tab: "general",
  },
};

const LOCAL_SETTINGS_KEY = "nion.local-settings";
const THREAD_MODEL_KEY_PREFIX = "nion.thread-model.";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export interface LocalSettings {
  notification: {
    enabled: boolean;
  };
  context: Omit<
    AgentThreadContext,
    "thread_id" | "is_plan_mode" | "thinking_enabled" | "subagent_enabled"
  > & {
    model_name_manually_selected?: boolean;
    mode: "flash" | "thinking" | "pro" | "ultra" | undefined;
    reasoning_effort?: "minimal" | "low" | "medium" | "high";
  };
  layout: {
    sidebar_collapsed: boolean;
    recent_chat_tab: WorkspaceThreadType;
  };
}

function mergeLocalSettings(settings?: Partial<LocalSettings>): LocalSettings {
  return {
    ...DEFAULT_LOCAL_SETTINGS,
    context: {
      ...DEFAULT_LOCAL_SETTINGS.context,
      ...settings?.context,
    },
    layout: {
      ...DEFAULT_LOCAL_SETTINGS.layout,
      ...settings?.layout,
    },
    notification: {
      ...DEFAULT_LOCAL_SETTINGS.notification,
      ...settings?.notification,
    },
  };
}

function getThreadModelStorageKey(threadId: string): string {
  return `${THREAD_MODEL_KEY_PREFIX}${threadId}`;
}

export function getThreadModelName(threadId: string): string | undefined {
  if (!isBrowser()) {
    return undefined;
  }
  return localStorage.getItem(getThreadModelStorageKey(threadId)) ?? undefined;
}

export function saveThreadModelName(
  threadId: string,
  modelName: string | undefined,
) {
  if (!isBrowser()) {
    return;
  }
  const key = getThreadModelStorageKey(threadId);
  if (!modelName) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, modelName);
}

function applyThreadModelOverride(
  settings: LocalSettings,
  threadId?: string,
): LocalSettings {
  const threadModelName = threadId ? getThreadModelName(threadId) : undefined;
  if (!threadModelName) {
    return settings;
  }
  return {
    ...settings,
    context: {
      ...settings.context,
      model_name: threadModelName,
    },
  };
}

export function getLocalSettings(): LocalSettings {
  if (!isBrowser()) {
    return DEFAULT_LOCAL_SETTINGS;
  }
  const json = localStorage.getItem(LOCAL_SETTINGS_KEY);
  try {
    if (json) {
      const settings = JSON.parse(json) as Partial<LocalSettings>;
      return mergeLocalSettings(settings);
    }
  } catch {}
  return DEFAULT_LOCAL_SETTINGS;
}

export function getThreadLocalSettings(threadId: string): LocalSettings {
  return applyThreadModelOverride(getLocalSettings(), threadId);
}

export function saveLocalSettings(settings: LocalSettings) {
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

export function saveThreadLocalSettings(
  threadId: string,
  settings: LocalSettings,
) {
  saveLocalSettings(settings);
  const modelName =
    typeof settings.context.model_name === "string"
      ? settings.context.model_name
      : undefined;
  saveThreadModelName(threadId, modelName);
}
