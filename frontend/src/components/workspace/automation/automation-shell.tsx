"use client";

import type { ReactNode } from "react";

export function AutomationShell({ children }: { children: ReactNode }) {
  return <main className="flex size-full min-h-0 flex-col overflow-hidden">{children}</main>;
}
