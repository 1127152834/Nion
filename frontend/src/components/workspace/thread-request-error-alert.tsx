"use client";

import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ThreadRequestErrorCopy } from "@/core/threads/error-copy";

export function ThreadRequestErrorAlert({
  error,
}: {
  error: ThreadRequestErrorCopy;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription>
        <p>{error.description}</p>
        {error.detail ? (
          <p className="break-words font-mono text-xs opacity-80">
            {error.detailsLabel}: {error.detail}
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
