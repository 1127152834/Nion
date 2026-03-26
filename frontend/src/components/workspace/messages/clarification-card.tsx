"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import type { PendingClarification } from "@/core/threads";
import { cn } from "@/lib/utils";

const BUTTON_MODE_MAX_OPTIONS = 4;
const BUTTON_MODE_MAX_LENGTH = 28;

function shouldUseButtonMode(options: string[]) {
  return (
    options.length <= BUTTON_MODE_MAX_OPTIONS &&
    options.every((option) => option.trim().length <= BUTTON_MODE_MAX_LENGTH)
  );
}

export function ClarificationCard({
  clarification,
  className,
  onSelect,
}: {
  clarification: PendingClarification;
  className?: string;
  onSelect?: (option: string) => void;
}) {
  const { t } = useI18n();
  const [selectedOption, setSelectedOption] = useState<string>("");
  const useButtonMode = useMemo(
    () => shouldUseButtonMode(clarification.options),
    [clarification.options],
  );

  return (
    <div
      className={cn(
        "bg-background/70 border-border/70 flex w-full flex-col gap-4 rounded-2xl border px-5 py-4 shadow-sm backdrop-blur-sm",
        className,
      )}
      data-clarification-card
    >
      <div className="flex flex-col gap-1">
        <div className="text-foreground text-sm font-semibold">
          {t.toolCalls.needYourHelp}
        </div>
        <p className="text-foreground text-[15px] leading-7">
          {clarification.question}
        </p>
        {clarification.context ? (
          <p className="text-muted-foreground text-sm leading-6">
            {clarification.context}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {t.inputBox.clarificationHelper}
        </p>
      </div>

      {useButtonMode ? (
        <div className="flex flex-wrap gap-2" data-clarification-mode="buttons">
          {clarification.options.map((option) => (
            <Button
              key={option}
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onSelect?.(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-clarification-mode="select">
          <div className="text-muted-foreground text-xs font-medium">
            {t.inputBox.clarificationChooseOption}
          </div>
          <div className="flex flex-col gap-2">
            {clarification.options.map((option) => {
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
                    name={`clarification-${clarification.toolMessageId ?? clarification.question}`}
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
                if (selectedOption) {
                  onSelect?.(selectedOption);
                }
              }}
            >
              {t.inputBox.clarificationSubmitChoice}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
