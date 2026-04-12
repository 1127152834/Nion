import { getBackendBaseURL } from "@/core/config";

export type ExecutionMode = "sandbox" | "host";

export interface RuntimeProfile {
  execution_mode: ExecutionMode;
  host_workdir: string | null;
  locked: boolean;
  updated_at?: string | null;
}

const RUNTIME_PROFILE_FETCH_RETRY_DELAYS_MS = [150, 350, 700, 1200, 1800, 2400];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type DesktopRuntimeWindow = Window & {
  nionDesktop?: {
    getRuntimeInfo?: () => Promise<{
      baseUrl?: string | null;
      clientId?: string | null;
    }>;
  };
};

async function resolveRuntimeProfileBaseURL(): Promise<string> {
  if (typeof window !== "undefined") {
    const desktopWindow = window as DesktopRuntimeWindow;
    const runtimeInfoLoader = desktopWindow.nionDesktop?.getRuntimeInfo;
    if (typeof runtimeInfoLoader === "function") {
      for (let attempt = 0; attempt <= RUNTIME_PROFILE_FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const runtimeInfo = await runtimeInfoLoader();
          const baseUrl = runtimeInfo?.baseUrl?.trim();
          if (baseUrl) {
            return baseUrl;
          }
        } catch {
          // The desktop main process may not have registered the runtime-info IPC handler yet.
        }
        const delayMs = RUNTIME_PROFILE_FETCH_RETRY_DELAYS_MS[attempt];
        if (delayMs === undefined) {
          break;
        }
        await sleep(delayMs);
      }
    }
  }

  return getBackendBaseURL();
}

export async function fetchRuntimeProfile(
  threadId: string,
): Promise<RuntimeProfile> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RUNTIME_PROFILE_FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await fetchRuntimeProfileOnce(threadId);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.startsWith("Failed to load runtime profile")) {
        throw error;
      }
      const delayMs = RUNTIME_PROFILE_FETCH_RETRY_DELAYS_MS[attempt];
      if (delayMs === undefined) {
        break;
      }
      await sleep(delayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to load runtime profile");
}

async function fetchRuntimeProfileOnce(threadId: string): Promise<RuntimeProfile> {
  const baseUrl = await resolveRuntimeProfileBaseURL();
  const response = await fetch(
    `${baseUrl}/api/threads/${threadId}/runtime-profile`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load runtime profile (${response.status})`);
  }
  return (await response.json()) as RuntimeProfile;
}

export async function updateRuntimeProfile(
  threadId: string,
  payload: {
    execution_mode: ExecutionMode;
    host_workdir?: string | null;
  },
): Promise<RuntimeProfile> {
  const baseUrl = await resolveRuntimeProfileBaseURL();
  const response = await fetch(
    `${baseUrl}/api/threads/${threadId}/runtime-profile`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Failed to update runtime profile (${response.status})`);
  }
  return (await response.json()) as RuntimeProfile;
}
