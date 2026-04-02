"use client";

import Link from "next/link";

import {
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsDesktopShell } from "@/core/runtime";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export function WorkspaceHeader({ className }: { className?: string }) {
  const { state, toggleSidebar } = useSidebar();
  const isDesktopShell = useIsDesktopShell();
  const isCollapsed = state === "collapsed";
  const wordmarkClassName = cn(
    "text-primary shrink-0 font-serif transition-[font-size,letter-spacing,margin,padding] duration-200",
    isDesktopShell && "text-[1.625rem] tracking-[0.04em]",
    isDesktopShell
      ? "leading-none ml-1.5 mt-2.5"
      : "tracking-[0.08em]",
  );

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
          isDesktopShell && "h-16 px-4 pt-6 pb-2",
          isCollapsed && "hidden",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            isDesktopShell && "gap-2.5 pl-5",
          )}
        >
          {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ? (
            <Link
              href="/"
              className={wordmarkClassName}
            >
              Nion
            </Link>
          ) : (
            <div className={cn(wordmarkClassName, "cursor-default")}>
              Nion
            </div>
          )}
          <div className={cn(isDesktopShell && "mt-2.5")}>
            <SidebarTrigger
              className={cn(
                "rounded-full border border-sidebar-border/70 bg-sidebar-accent/35 hover:bg-sidebar-accent/70",
                isDesktopShell
                  && "size-6 border-sidebar-border/50 bg-sidebar-accent/20 text-sidebar-foreground/70 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
              )}
            />
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
