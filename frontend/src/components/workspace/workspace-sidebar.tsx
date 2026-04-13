"use client";

import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

import { RecentChatList } from "./recent-chat-list";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceNavChatList } from "./workspace-nav-chat-list";
import { WorkspaceNavMenu } from "./workspace-nav-menu";
import { WorkspaceSidebarChildRuns } from "./workspace-sidebar-child-runs";
import { WorkspaceSidebarPrimaryAction } from "./workspace-sidebar-primary-action";

export function WorkspaceSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const isSidebarOpen = state === "expanded";

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader className="py-0">
        <WorkspaceHeader />
      </SidebarHeader>
      <SidebarContent
        className="overflow-hidden"
        data-sidebar-scroll-shell="fixed"
      >
        <Suspense fallback={null}>
          <WorkspaceSidebarPrimaryAction />
        </Suspense>
        <SidebarSeparator />
        <WorkspaceNavChatList />
        {isSidebarOpen ? (
          <>
            <SidebarSeparator />
            <Suspense fallback={null}>
              <WorkspaceSidebarChildRuns />
            </Suspense>
            <SidebarSeparator />
            <Suspense fallback={null}>
              <RecentChatList />
            </Suspense>
          </>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <WorkspaceNavMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
