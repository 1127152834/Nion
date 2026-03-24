"use client";

import { createDesktopThreadClient, type DesktopThreadClient } from "./desktop-client";

let _singleton: DesktopThreadClient | null = null;
let _mockSingleton: DesktopThreadClient | null = null;

export function getAPIClient(isMock?: boolean): DesktopThreadClient {
  if (isMock) {
    _mockSingleton ??= createDesktopThreadClient({ isMock: true });
    return _mockSingleton;
  }

  _singleton ??= createDesktopThreadClient({ isMock: false });
  return _singleton;
}
