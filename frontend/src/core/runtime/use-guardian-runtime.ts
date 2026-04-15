"use client";

import { useCallback, useEffect, useState } from "react";

import { getDesktopRuntimeInfo } from "../api/desktop-client.ts";
import type { BridgeRuntimeInfo } from "../bridge/client.ts";
import { getBridgeClient } from "../bridge/client.ts";
import {
  createGuardianRuntimeSnapshot,
  type GuardianRuntimeSnapshot,
  resolveGuardianRuntimeSnapshot,
} from "./guardian-runtime.ts";

export function useGuardianRuntime() {
  const [snapshot, setSnapshot] = useState<GuardianRuntimeSnapshot>(() =>
    createGuardianRuntimeSnapshot("loading"),
  );

  const refresh = useCallback(async () => {
    try {
      const desktopRuntime = await getDesktopRuntimeInfo();
      let bridgeRuntime: BridgeRuntimeInfo | null = null;
      let bridgeRuntimeError = false;

      try {
        bridgeRuntime = (await getBridgeClient()?.getRuntimeInfo()) ?? null;
      } catch {
        bridgeRuntimeError = true;
      }

      setSnapshot(
        resolveGuardianRuntimeSnapshot({
          desktopRuntime,
          bridgeRuntime: bridgeRuntime ?? null,
          bridgeRuntimeError,
        }),
      );
    } catch {
      setSnapshot(
        resolveGuardianRuntimeSnapshot({
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
