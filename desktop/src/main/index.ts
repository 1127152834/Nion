import { PRELOAD_ENTRY } from "../shared/ipc.js";

export function describeDesktopShell() {
  return {
    process: "main",
    preloadEntry: PRELOAD_ENTRY,
  };
}
