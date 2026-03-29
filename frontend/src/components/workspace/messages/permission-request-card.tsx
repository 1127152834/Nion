"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import type { PendingPermissionRequest } from "@/core/threads";
import { cn } from "@/lib/utils";

const BUTTON_MODE_OPTIONS = ["Allow", "Allow Session", "Deny"];

export function PermissionRequestCard({
  permissionRequest,
  className,
  onDecision,
}: {
  permissionRequest: PendingPermissionRequest;
  className?: string;
  onDecision?: (decision: "allow" | "allow_session" | "deny") => void;
}) {
  const { t } = useI18n();
  const [selectedOption, setSelectedOption] = useState<string>("");
  const useButtonMode = useMemo(
    () =>
      permissionRequest.options.length === BUTTON_MODE_OPTIONS.length &&
      permissionRequest.options.every((option, index) => option === BUTTON_MODE_OPTIONS[index]),
    [permissionRequest.options],
  );

  return (
    <div
      className={cn(
        "bg-background/70 border-border/70 flex w-full flex-col gap-4 rounded-2xl border px-5 py-4 shadow-sm backdrop-blur-sm",
        className,
      )}
      data-permission-request-card
    >
      <div className="flex flex-col gap-1">
        <div className="text-foreground text-sm font-semibold">
          {t.toolCalls.needYourHelp}
        </div>
        <p className="text-foreground text-[15px] leading-7">
          {permissionRequest.reasonMessage || "Permission required to continue."}
        </p>
        <p className="text-muted-foreground text-sm leading-6">
          {permissionRequest.toolName}
        </p>
        <pre className="bg-muted/40 text-muted-foreground overflow-x-auto rounded-xl p-3 text-xs leading-5 whitespace-pre-wrap">
          {JSON.stringify(permissionRequest.toolInput, null, 2)}
        </pre>
      </div>

      {useButtonMode ? (
        <div className="flex flex-wrap gap-2" data-permission-mode="buttons">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => onDecision?.("allow")}>
            Allow
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => onDecision?.("allow_session")}
          >
            Allow Session
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => onDecision?.("deny")}>
            Deny
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-permission-mode="select">
          <div className="text-muted-foreground text-xs font-medium">
            Choose an action
          </div>
          <div className="flex flex-col gap-2">
            {permissionRequest.options.map((option) => {
              const checked = selectedOption === option;
              return (
                <label
                  key={option}
                  className={cn(
                    "border-border/70 hover:bg-accent/40 flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition-colors",
                    checked && "border-foreground/30 bg-accent/30",
                  )}
                >
                  <input
                    type="radio"
                    name={`permission-${permissionRequest.requestId}`}
                    value={option}
                    checked={checked}
                    onChange={() => setSelectedOption(option)}
                    className="mt-1"
                  />
                  <span className="text-sm leading-6">{option}</span>
                </label>
              );
            })}
          </div>
          <div>
            <Button
              type="button"
              disabled={!selectedOption}
              onClick={() => {
                if (selectedOption === "Allow") {
                  onDecision?.("allow");
                } else if (selectedOption === "Allow Session") {
                  onDecision?.("allow_session");
                } else if (selectedOption === "Deny") {
                  onDecision?.("deny");
                }
              }}
            >
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
