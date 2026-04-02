"use client";

import { useI18n } from "@/core/i18n/hooks";

export type MemoryMapSection = "user" | "history" | "facts";
export type MemoryMapLeaf =
  | "work"
  | "personal"
  | "topOfMind"
  | "recentMonths"
  | "earlierContext"
  | "longTermBackground"
  | "factList";

export function MemoryMapNav(props: {
  activeSection: MemoryMapSection;
  activeLeaf: MemoryMapLeaf;
  onSectionChange: (section: MemoryMapSection, leaf: MemoryMapLeaf) => void;
}) {
  const { t } = useI18n();

  const groups = [
    {
      section: "user" as const,
      label: t.settings.memory.markdown.userContext,
      leaves: [
        { key: "work" as const, label: t.settings.memory.markdown.work },
        { key: "personal" as const, label: t.settings.memory.markdown.personal },
        {
          key: "topOfMind" as const,
          label: t.settings.memory.markdown.topOfMind,
        },
      ],
    },
    {
      section: "history" as const,
      label: t.settings.memory.markdown.historyBackground,
      leaves: [
        {
          key: "recentMonths" as const,
          label: t.settings.memory.markdown.recentMonths,
        },
        {
          key: "earlierContext" as const,
          label: t.settings.memory.markdown.earlierContext,
        },
        {
          key: "longTermBackground" as const,
          label: t.settings.memory.markdown.longTermBackground,
        },
      ],
    },
    {
      section: "facts" as const,
      label: t.settings.memory.markdown.facts,
      leaves: [{ key: "factList" as const, label: t.settings.memory.markdown.facts }],
    },
  ];

  return (
    <aside className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-3">
      <div className="mb-3 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        Memory map
      </div>
      <div className="space-y-4">
        {groups.map((group) => {
          const sectionActive = props.activeSection === group.section;
          const firstLeaf = group.leaves[0];
          if (!firstLeaf) return null;
          return (
            <div key={group.section} className="space-y-2">
              <button
                type="button"
                onClick={() => props.onSectionChange(group.section, firstLeaf.key)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  sectionActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-[color:var(--border)] bg-[color:var(--muted)] text-foreground"
                }`}
              >
                {group.label}
              </button>
              <div className="space-y-0 border-t border-[color:var(--border)]">
                {group.leaves.map((leaf) => {
                  const leafActive = props.activeLeaf === leaf.key;
                  return (
                    <button
                      key={leaf.key}
                      type="button"
                      onClick={() => props.onSectionChange(group.section, leaf.key)}
                      className={`flex w-full items-center rounded-md border px-3 py-3 text-left text-sm transition-colors ${
                        leafActive
                          ? "border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--muted)_68%,white)] font-semibold text-foreground"
                          : "border-[color:var(--border)] bg-transparent text-foreground/85"
                      }`}
                    >
                      <span>{leaf.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
