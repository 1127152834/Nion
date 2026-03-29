"use client";

import {
  BookTextIcon,
  BotIcon,
  Clock3Icon,
  MessagesSquare,
  FolderKanbanIcon,
  SquareTerminalIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isAutomationPath } from "@/core/automation/routing";
import { useI18n } from "@/core/i18n/hooks";

export function WorkspaceNavChatList() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <SidebarGroup className="pt-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={pathname === "/workspace/chats"} asChild>
            <Link className="text-muted-foreground" href="/workspace/chats">
              <MessagesSquare />
              <span>{t.sidebar.chats}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/projects")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/projects">
              <FolderKanbanIcon />
              <span>{t.sidebar.projects}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/agents")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/agents">
              <BotIcon />
              <span>{t.sidebar.agents}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={isAutomationPath(pathname)} asChild>
            <Link className="text-muted-foreground" href="/workspace/automation">
              <Clock3Icon />
              <span>{t.sidebar.automation}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/cli-tools")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/cli-tools">
              <SquareTerminalIcon />
              <span>{t.sidebar.cliTools}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/notebook")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/notebook">
              <BookTextIcon />
              <span>{t.sidebar.notebook}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
