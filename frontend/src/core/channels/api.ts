import { getBackendBaseURL } from "@/core/config";

import type { ChannelOpsResponse, ChannelRestartResponse } from "./types";

export async function loadChannelOps() {
  const response = await fetch(`${getBackendBaseURL()}/api/channels`);
  if (!response.ok) {
    throw new Error("Failed to load channel operations.");
  }

  return (await response.json()) as ChannelOpsResponse;
}

export async function restartChannel(name: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/channels/${name}/restart`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to restart channel: ${name}`);
  }

  return (await response.json()) as ChannelRestartResponse;
}
