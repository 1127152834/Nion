import { NotebookPage } from "@/components/workspace/notebook/notebook-page";

export default function WorkspaceNotebookPage() {
  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <NotebookPage />
        </div>
      </div>
    </main>
  );
}
