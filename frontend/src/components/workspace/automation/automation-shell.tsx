"use client";

import type { ReactNode } from "react";

export function AutomationShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
          {children}
        </div>
      </div>
    </main>
  );
}
