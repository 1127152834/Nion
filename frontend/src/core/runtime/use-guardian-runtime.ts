"use client";

import { useCallback, useEffect, useState } from "react";

import { getDesktopRuntimeInfo } from "../api/desktop-client.ts";
import { getBridgeClient } from "../bridge/client.ts";
import {
  type GuardianRuntimeSnapshot,
  mergeGuardianRuntime,
} from "./guardian-runtime.ts";

export function useGuardianRuntime() {
  const [snapshot, setSnapshot] = useState<GuardianRuntimeSnapshot>(() => ({
    loadState: "loading",
    guardianStatus: "offline",
    bridgeRunning: null,
    bridgeAutoStartEnabled: null,
    enabledPlatforms: null,
    activeBindings: null,
    openIncidents: null,
    startedAt: null,
  }));

  const refresh = useCallback(async () => {
    try {
      const desktopRuntime = await getDesktopRuntimeInfo();
      const bridgeRuntime = await getBridgeClient()?.getRuntimeInfo().catch(() => null);

      setSnapshot(
        mergeGuardianRuntime({
          desktopRuntime,
          bridgeRuntime: bridgeRuntime ?? null,
        }),
      );
    } catch {
      setSnapshot(
        mergeGuardianRuntime({
          desktopRuntime: null,
          bridgeRuntime: null,
          error: "error",
        }),
      );
    }
  }, []);

  useEffect(() => {
    void refresh();

    const handleWindowFocus = () => {
      void refresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return { snapshot, refresh };
}
