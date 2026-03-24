import { ToolPolicyPage } from "@/components/workspace/tool-policy/tool-policy-page";

export default function WorkspaceToolPolicyPage() {
  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <ToolPolicyPage />
        </div>
      </div>
    </main>
  );
}
