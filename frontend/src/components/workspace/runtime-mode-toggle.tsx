"use client";

import { MonitorIcon, ShieldCheckIcon } from "lucide-react";

import { Tooltip } from "@/components/workspace/tooltip";
import { cn } from "@/lib/utils";

export type RuntimeModeToggleMode = "sandbox" | "host";

export type RuntimeModeCopy = {
  sandboxLabel: string;
  hostLabel: string;
  sandboxTip: string;
  hostTip: string;
  hostBoundDirectory: string;
  locked: string;
  lockedTip: string;
  modeSaveFailed: string;
};

export function RuntimeModeToggle({
  mode,
  locked,
  saving,
  hostDirPath,
  copy,
  onSwitch,
  className,
}: {
  mode: RuntimeModeToggleMode;
  locked: boolean;
  saving: boolean;
  hostDirPath?: string | null;
  copy: RuntimeModeCopy;
  onSwitch: (nextMode: RuntimeModeToggleMode) => void;
  className?: string;
}) {
  const switchDisabled = saving || locked;

  return (
    <div className={cn("relative inline-flex min-w-[250px] max-w-full items-center justify-center", className)}>
      <div className="relative inline-grid grid-cols-2 gap-1 rounded-[1.55rem] bg-[linear-gradient(180deg,rgba(250,248,243,0.94),rgba(239,234,225,0.9))] p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.92),inset_0_-1px_2px_rgba(102,88,63,0.08)]">
        <div
          className={cn(
            "pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-7px)] rounded-[1.2rem] transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            mode === "sandbox"
              ? "bg-[linear-gradient(180deg,rgba(229,250,237,0.98),rgba(201,242,219,0.92))] shadow-[0_14px_28px_-18px_rgba(22,163,74,0.55)]"
              : "translate-x-full bg-[linear-gradient(180deg,rgba(255,241,214,0.98),rgba(250,221,163,0.92))] shadow-[0_14px_28px_-18px_rgba(217,119,6,0.58)]",
          )}
        />
        <Tooltip
          content={
            <div className="space-y-1.5 text-left">
              <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-100/72 uppercase">
                {copy.sandboxLabel}
              </div>
              <div className="text-xs leading-relaxed text-stone-200/88">
                {copy.sandboxTip}
              </div>
            </div>
          }
        >
          <button
            type="button"
            aria-label={copy.sandboxLabel}
            disabled={switchDisabled}
            onClick={() => onSwitch("sandbox")}
            className={cn(
              "relative flex h-12 w-[4.8rem] items-center justify-center rounded-[1.1rem] transition-[color,opacity,transform] duration-[260ms] sm:w-[5.4rem]",
              mode === "sandbox"
                ? "-translate-y-px text-emerald-700 drop-shadow-[0_3px_8px_rgba(22,163,74,0.32)]"
                : "text-foreground/55 hover:text-foreground/82",
              switchDisabled && "cursor-not-allowed opacity-55",
            )}
          >
            <ShieldCheckIcon className="size-5.5" />
          </button>
        </Tooltip>
        <Tooltip
          content={
            <div className="space-y-1.5 text-left">
              <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-100/72 uppercase">
                {copy.hostLabel}
              </div>
              <div className="text-xs leading-relaxed text-stone-200/88">
                {copy.hostTip}
              </div>
              {hostDirPath ? (
                <div className="break-all text-xs leading-relaxed text-stone-200/88">
                  <span className="font-medium text-stone-50">
                    {copy.hostBoundDirectory}:{" "}
                  </span>
                  {hostDirPath}
                </div>
              ) : null}
              {locked ? (
                <div className="text-xs leading-relaxed text-amber-200/92">
                  {copy.lockedTip}
                </div>
              ) : null}
            </div>
          }
        >
          <button
            type="button"
            aria-label={copy.hostLabel}
            disabled={switchDisabled}
            onClick={() => onSwitch("host")}
            className={cn(
              "relative flex h-12 w-[4.8rem] items-center justify-center rounded-[1.1rem] transition-[color,opacity,transform] duration-[260ms] sm:w-[5.4rem]",
              mode === "host"
                ? "-translate-y-px text-amber-700 drop-shadow-[0_3px_8px_rgba(217,119,6,0.35)]"
                : "text-foreground/55 hover:text-foreground/82",
              switchDisabled && "cursor-not-allowed opacity-55",
            )}
          >
            <MonitorIcon className="size-5.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

