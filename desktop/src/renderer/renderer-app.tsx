import { HashRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

import { ThemeProvider } from "@/components/theme-provider";
import WorkspaceLayout from "@/app/workspace/layout";
import WorkspacePage from "@/app/workspace/page";
import ChatsPage from "@/app/workspace/chats/page";
import AgentsPage from "@/app/workspace/agents/page";
import NewAgentPage from "@/app/workspace/agents/new/page";
import AboutPage from "@/app/workspace/about/page";
import AutomationPage from "@/app/workspace/automation/page";
import AutomationRemindersPage from "@/app/workspace/automation/reminders/page";
import AutomationTasksPage from "@/app/workspace/automation/tasks/page";
import BridgePage from "@/app/workspace/bridge/page";
import WorkspaceMemoryPage from "@/app/workspace/memory/page";
import WorkspaceMemoryFactsPage from "@/app/workspace/memory/facts/page";
import WorkspaceMemoryGrowthPage from "@/app/workspace/memory/growth/page";
import WorkspaceMemoryHistoryPage from "@/app/workspace/memory/history/page";
import WorkspaceMemoryRuntimeTracePage from "@/app/workspace/memory/runtime-trace/page";
import WorkspaceMemorySearchPage from "@/app/workspace/memory/search/page";
import WorkspaceMemorySearchResultsPage from "@/app/workspace/memory/search/results/page";
import WorkspaceMemorySoulPage from "@/app/workspace/memory/soul/page";
import WorkspaceMemoryUserPage from "@/app/workspace/memory/user/page";
import NotebookPage from "@/app/workspace/notebook/page";
import NotebookTrashPage from "@/app/workspace/notebook/trash/page";
import ToolPolicyPage from "@/app/workspace/tool-policy/page";
import { AutomationJobDetailPage } from "@/components/workspace/automation/automation-job-detail-page";
import { AutomationShell } from "@/components/workspace/automation/automation-shell";
import { I18nProvider } from "@/core/i18n/context";
import { detectLocale } from "@/core/i18n";

import { DesktopImageProvider } from "./shims/image-context";

function WorkspaceRoute({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}

function DesktopAutomationReminderDetailRoute() {
  const { jobId = "" } = useParams<{ jobId: string }>();

  return (
    <AutomationShell>
      <AutomationJobDetailPage kind="reminder" jobId={jobId} />
    </AutomationShell>
  );
}

function DesktopAutomationTaskDetailRoute() {
  const { jobId = "" } = useParams<{ jobId: string }>();

  return (
    <AutomationShell>
      <AutomationJobDetailPage kind="scheduled_task" jobId={jobId} />
    </AutomationShell>
  );
}

export function DesktopRendererApp() {
  return (
    <HashRouter>
      <ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
        <I18nProvider initialLocale={detectLocale()}>
          <DesktopImageProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/workspace" replace />} />
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route
                path="/workspace/chats"
                element={
                  <WorkspaceRoute>
                    <ChatsPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/agents"
                element={
                  <WorkspaceRoute>
                    <AgentsPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/agents/new"
                element={
                  <WorkspaceRoute>
                    <NewAgentPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/bridge"
                element={
                  <WorkspaceRoute>
                    <BridgePage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/about"
                element={
                  <WorkspaceRoute>
                    <AboutPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/automation"
                element={
                  <WorkspaceRoute>
                    <AutomationPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/automation/reminders"
                element={
                  <WorkspaceRoute>
                    <AutomationRemindersPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/automation/reminders/:jobId"
                element={
                  <WorkspaceRoute>
                    <DesktopAutomationReminderDetailRoute />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/automation/tasks"
                element={
                  <WorkspaceRoute>
                    <AutomationTasksPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/automation/tasks/:jobId"
                element={
                  <WorkspaceRoute>
                    <DesktopAutomationTaskDetailRoute />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/notebook"
                element={
                  <WorkspaceRoute>
                    <NotebookPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/notebook/trash"
                element={
                  <WorkspaceRoute>
                    <NotebookTrashPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/memory"
                element={
                  <WorkspaceRoute>
                    <WorkspaceMemoryPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/memory/search"
                element={
                  <WorkspaceRoute>
                    <WorkspaceMemorySearchPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/memory/search/results"
                element={
                  <WorkspaceRoute>
                    <WorkspaceMemorySearchResultsPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/memory/user"
                element={
                  <WorkspaceRoute>
                    <WorkspaceMemoryUserPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/memory/history"
                element={
                  <WorkspaceRoute>
                    <WorkspaceMemoryHistoryPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/memory/facts"
                element={
                  <WorkspaceRoute>
                    <WorkspaceMemoryFactsPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/memory/growth"
                element={
                  <WorkspaceRoute>
                    <WorkspaceMemoryGrowthPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/memory/soul"
                element={
                  <WorkspaceRoute>
                    <WorkspaceMemorySoulPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/memory/runtime-trace"
                element={
                  <WorkspaceRoute>
                    <WorkspaceMemoryRuntimeTracePage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/tool-policy"
                element={
                  <WorkspaceRoute>
                    <ToolPolicyPage />
                  </WorkspaceRoute>
                }
              />
              <Route path="*" element={<Navigate to="/workspace/chats" replace />} />
            </Routes>
          </DesktopImageProvider>
        </I18nProvider>
      </ThemeProvider>
    </HashRouter>
  );
}
