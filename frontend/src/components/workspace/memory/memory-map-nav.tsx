"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/core/i18n/hooks";
import {
  pathOfMemory,
  pathOfMemoryFacts,
  pathOfMemoryHistory,
  pathOfMemorySearch,
  pathOfMemoryUser,
} from "@/core/navigation/desktop-routes";

export function MemoryMapNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  const items = [
    {
      href: pathOfMemory(),
      label: "记忆首页",
    },
    {
      href: pathOfMemorySearch(),
      label: "检索控制台",
    },
    {
      href: pathOfMemoryUser(),
      label: t.settings.memory.markdown.userContext,
    },
    {
      href: pathOfMemoryHistory(),
      label: t.settings.memory.markdown.historyBackground,
    },
    {
      href: pathOfMemoryFacts(),
      label: t.settings.memory.markdown.facts,
    },
  ];

  return (
    <aside className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-3">
      <div className="mb-3 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        Memory map
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block border-b border-[color:var(--border)] px-1 py-2 text-left text-sm transition-colors ${
                active ? "font-semibold text-foreground" : "text-foreground/78"
              }`}
            >
              <span className="inline-flex flex-col pb-1">
                {item.label}
                <span
                  className={`mt-1 h-0.5 bg-foreground transition-[width] duration-200 ease-out ${
                    active ? "w-full" : "w-0"
                  }`}
                />
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
