"use client";

import { createThreadClient, type ThreadClient } from "./thread-client";

let _singleton: ThreadClient | null = null;
let _mockSingleton: ThreadClient | null = null;

export function getAPIClient(isMock?: boolean): ThreadClient {
  if (isMock) {
    _mockSingleton ??= createThreadClient({ isMock: true });
    return _mockSingleton;
  }

  _singleton ??= createThreadClient({ isMock: false });
  return _singleton;
}
