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
import { WorkspaceSwitcher } from "./workspace-switcher";

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
        {isSidebarOpen ? (
          <>
            <div className="px-3 py-2">
              <WorkspaceSwitcher />
            </div>
            <SidebarSeparator />
          </>
        ) : null}
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
