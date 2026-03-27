import { Suspense } from "react";

import { NotebookPage } from "@/components/workspace/notebook/notebook-page";

export default function WorkspaceNotebookPage() {
  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden bg-background">
      <Suspense fallback={null}>
        <NotebookPage />
      </Suspense>
    </main>
  );
}
