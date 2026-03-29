"use client";

import { CliToolsManager } from "@/components/workspace/cli-tools";

export default function CliToolsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <CliToolsManager />
      </div>
    </div>
  );
}
