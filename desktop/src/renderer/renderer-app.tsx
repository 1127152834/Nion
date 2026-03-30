import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { ThemeProvider } from "@/components/theme-provider";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import WorkspaceLayout from "@/app/workspace/layout";
import WorkspacePage from "@/app/workspace/page";
import ChatsPage from "@/app/workspace/chats/page";
import AgentsPage from "@/app/workspace/agents/page";
import AboutPage from "@/app/workspace/about/page";
import AutomationPage from "@/app/workspace/automation/page";
import BridgePage from "@/app/workspace/bridge/page";
import NotebookPage from "@/app/workspace/notebook/page";
import NotebookTrashPage from "@/app/workspace/notebook/trash/page";
import ToolPolicyPage from "@/app/workspace/tool-policy/page";
import { I18nProvider } from "@/core/i18n/context";
import { detectLocale } from "@/core/i18n";

import { DesktopImageProvider } from "./shims/image-context";

function WorkspaceRoute({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayout>{children}</WorkspaceLayout>;
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
