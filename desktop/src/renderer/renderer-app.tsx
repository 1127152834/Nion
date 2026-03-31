import { HashRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

import { ThemeProvider } from "@/components/theme-provider";
import WorkspaceLayout from "@/app/workspace/layout";
import WorkspacePage from "@/app/workspace/page";
import ChatsPage from "@/app/workspace/chats/page";
import AgentsPage from "@/app/workspace/agents/page";
import AboutPage from "@/app/workspace/about/page";
import AutomationPage from "@/app/workspace/automation/page";
import BridgePage from "@/app/workspace/bridge/page";
import NotebookPage from "@/app/workspace/notebook/page";
import NotebookTrashPage from "@/app/workspace/notebook/trash/page";
import WorkspaceProjectThreadPage from "@/app/workspace/projects/[project_id]/threads/[thread_id]/page";
import { ProjectDashboardPage } from "@/components/workspace/projects/project-dashboard-page";
import { ProjectListPage } from "@/components/workspace/projects/project-list-page";
import ToolPolicyPage from "@/app/workspace/tool-policy/page";
import { I18nProvider } from "@/core/i18n/context";
import { detectLocale } from "@/core/i18n";

import { DesktopImageProvider } from "./shims/image-context";

function WorkspaceRoute({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}

function DesktopProjectDashboardRoute() {
  const params = useParams<{ project_id: string }>();
  if (!params.project_id) {
    return <Navigate to="/workspace/projects" replace />;
  }
  return <ProjectDashboardPage projectId={params.project_id} />;
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
                path="/workspace/projects"
                element={
                  <WorkspaceRoute>
                    <ProjectListPage />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/projects/:project_id"
                element={
                  <WorkspaceRoute>
                    <DesktopProjectDashboardRoute />
                  </WorkspaceRoute>
                }
              />
              <Route
                path="/workspace/projects/:project_id/threads/:thread_id"
                element={
                  <WorkspaceRoute>
                    <WorkspaceProjectThreadPage />
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
                path="/workspace/tool-policy"
                element={
                  <WorkspaceRoute>
                    <ToolPolicyPage />
                  </WorkspaceRoute>
                }
              />
            </Routes>
          </DesktopImageProvider>
        </I18nProvider>
      </ThemeProvider>
    </HashRouter>
  );
}
