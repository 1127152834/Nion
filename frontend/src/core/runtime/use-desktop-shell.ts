"use client";

import { useEffect, useState } from "react";

type DesktopWindow = Window & {
  nionDesktop?: {
    getRuntimeInfo?: () => Promise<unknown>;
  };
};

function hasDesktopShellBridge() {
  if (typeof window === "undefined") {
    return false;
  }

  return typeof (window as DesktopWindow).nionDesktop?.getRuntimeInfo === "function";
}

export function useIsDesktopShell() {
  const [isDesktopShell, setIsDesktopShell] = useState(false);

  useEffect(() => {
    setIsDesktopShell(hasDesktopShellBridge());
  }, []);

  return isDesktopShell;
}
