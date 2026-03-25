"use client";

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
      <SidebarContent>
        <WorkspaceSidebarPrimaryAction />
        <SidebarSeparator />
        <WorkspaceNavChatList />
        {isSidebarOpen ? (
          <>
            <SidebarSeparator />
            <RecentChatList />
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
