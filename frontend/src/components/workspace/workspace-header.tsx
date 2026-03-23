"use client";

import Link from "next/link";

import {
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export function WorkspaceHeader({ className }: { className?: string }) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div
      className={cn(
        "relative overflow-hidden border-b border-sidebar-border/60 transition-[background-color] duration-300 hover:bg-gradient-to-b hover:from-sidebar-accent/35 hover:to-transparent",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center justify-between px-3",
          isCollapsed && "hidden",
        )}
      >
        <div className="flex items-center gap-2">
          {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ? (
            <Link
              href="/"
              className="text-primary shrink-0 font-serif tracking-[0.08em]"
            >
              Nion
            </Link>
          ) : (
            <div className="text-primary shrink-0 cursor-default font-serif tracking-[0.08em]">
              Nion
            </div>
          )}
          <div className="ml-auto">
            <SidebarTrigger className="rounded-full border border-sidebar-border/70 bg-sidebar-accent/35 hover:bg-sidebar-accent/70" />
          </div>
        </div>
      </div>

      {isCollapsed ? (
        <div className="flex h-14 items-center justify-center">
          <button
            type="button"
            aria-label="Expand sidebar"
            className="text-primary font-serif tracking-[0.12em]"
            onClick={toggleSidebar}
          >
            NION
          </button>
        </div>
      ) : null}
    </div>
  );
}
