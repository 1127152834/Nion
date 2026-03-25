export type ThreadRequestErrorTranslations = {
  title: string;
  modelUnavailable: string;
  authenticationFailed: string;
  runtimeUnavailable: string;
  generic: string;
  detailsLabel: string;
};

export type ThreadRequestErrorCopy = {
  title: string;
  description: string;
  detail: string | null;
  detailsLabel: string;
};

export function getThreadRequestErrorMessage(error: unknown): string | null {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object" && error !== null) {
    const message = Reflect.get(error, "message");
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }

    const nestedError = Reflect.get(error, "error");
    if (nestedError instanceof Error && nestedError.message.trim()) {
      return nestedError.message.trim();
    }
    if (typeof nestedError === "string" && nestedError.trim()) {
      return nestedError.trim();
    }
  }

  return null;
}

export function getThreadRequestErrorCopy(
  error: unknown,
  copy: ThreadRequestErrorTranslations,
): ThreadRequestErrorCopy | null {
  const detail = getThreadRequestErrorMessage(error);
  if (!detail) {
    return null;
  }

  const normalized = detail.toLowerCase();
  let description = copy.generic;

  if (
    normalized.includes("no available accounts") ||
    (normalized.includes("503") && normalized.includes("api_error"))
  ) {
    description = copy.modelUnavailable;
  } else if (
    normalized.includes("401") ||
    normalized.includes("unauthorized") ||
    normalized.includes("authentication") ||
    normalized.includes("invalid api key") ||
    normalized.includes("api key")
  ) {
    description = copy.authenticationFailed;
  } else if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network error") ||
    normalized.includes("stream failed with status") ||
    normalized.includes("method not allowed") ||
    normalized.includes("cors") ||
    normalized.includes("timed out waiting for backend health")
  ) {
    description = copy.runtimeUnavailable;
  }

  return {
    title: copy.title,
    description,
    detail,
    detailsLabel: copy.detailsLabel,
  };
}
