import { type DesktopUpdateResult } from "../shared/ipc.js";

export type UpdateFeedConfig =
  | {
      provider: "github";
      channel: "latest";
    }
  | {
      provider: "generic";
      url: string;
      channel: "latest";
    };

export function resolveUpdateFeed(): UpdateFeedConfig {
  const genericUrl = process.env.NION_UPDATE_BASE_URL?.trim();
  if (genericUrl) {
    return {
      provider: "generic",
      url: genericUrl,
      channel: "latest",
    };
  }

  return {
    provider: "github",
    channel: "latest",
  };
}

export function idleUpdateStatus(config: UpdateFeedConfig): DesktopUpdateResult {
  return {
    provider: config.provider,
    status: "idle",
    message:
      config.provider === "generic"
        ? `Using generic update feed: ${config.url}`
        : "Using GitHub Releases update feed.",
  };
}
