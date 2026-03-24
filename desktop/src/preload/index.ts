import { PRELOAD_ENTRY } from "../shared/ipc.js";

export function describePreloadBridge() {
  return {
    process: "preload",
    channel: PRELOAD_ENTRY,
  };
}
