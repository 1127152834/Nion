import { NotebookTrashPage } from "@/components/workspace/notebook/notebook-trash-page";

export default function WorkspaceNotebookTrashPage() {
  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <NotebookTrashPage />
        </div>
      </div>
    </main>
  );
}
