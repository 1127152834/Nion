"use client";

type AutomationPageAlertProps = {
  error: unknown;
};

export function AutomationPageAlert({ error }: AutomationPageAlertProps) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700">
      {error instanceof Error ? error.message : String(error)}
    </div>
  );
}
