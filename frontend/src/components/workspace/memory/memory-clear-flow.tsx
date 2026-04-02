"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";

export function MemoryClearFlow(props: {
  open: boolean;
  factsCount: number;
  lastUpdatedLabel: string | null;
  affectedSections: string[];
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [confirmationText, setConfirmationText] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!props.open) {
      setStep(1);
      setConfirmationText("");
      setCountdown(3);
    }
  }, [props.open]);

  useEffect(() => {
    if (!props.open || step !== 3 || countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown, props.open, step]);

  const sections = useMemo(
    () => props.affectedSections.filter(Boolean),
    [props.affectedSections],
  );
  const phrase = "清空记忆";
  const phraseMatches = confirmationText.trim() === phrase;

  async function handleFinalConfirm() {
    await props.onConfirm();
    props.onOpenChange(false);
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t.settings.memory.clearAllConfirmTitle}</DialogTitle>
          <DialogDescription>
            {t.settings.memory.clearAllConfirmDescription}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="text-sm font-medium">
                {t.settings.memory.factPreviewLabel}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {t.settings.memory.clearFlowRiskSummary
                  .replace("{facts}", String(props.factsCount))
                  .replace(
                    "{updated}",
                    props.lastUpdatedLabel ?? t.settings.memory.notAvailable,
                  )}
              </div>
            </div>

            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {t.settings.memory.clearFlowIrreversible}
            </div>

            {sections.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {t.settings.memory.clearFlowAffectedSections}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sections.map((section) => (
                    <span
                      key={section}
                      className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t.settings.memory.clearFlowTypePhrase}
            </div>
            <div className="rounded-lg border bg-muted/20 px-3 py-2 font-mono text-sm">
              {phrase}
            </div>
            <Input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              placeholder={phrase}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="text-sm font-medium text-destructive">
                {t.settings.memory.clearFlowFinalWarning}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {t.settings.memory.clearFlowCountdownHint.replace(
                  "{seconds}",
                  String(countdown),
                )}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-end">
          {step < 3 ? (
            <Button
              type="button"
              disabled={step === 2 && !phraseMatches}
              onClick={() =>
                setStep((value) => (value === 3 ? value : value + 1))
              }
            >
              {t.common.continue}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={countdown > 0 || props.pending}
              onClick={() => void handleFinalConfirm()}
            >
              {props.pending
                ? t.common.loading
                : t.settings.memory.clearFlowFinalAction}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
