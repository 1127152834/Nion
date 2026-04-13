import { getBackendBaseURL } from "@/core/config";

import type {
  IdentityDocumentResponse,
  IdentityDocumentUpdateRequest,
} from "./document-types";
import type {
  UserIdentityPatchRequest,
  UserIdentityProfile,
} from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isUserIdentityProfile(value: unknown): value is UserIdentityProfile {
  return (
    isObjectRecord(value) &&
    typeof value.version === "string" &&
    typeof value.user_name === "string" &&
    isStringArray(value.user_aliases) &&
    typeof value.preferred_address_for_user === "string" &&
    typeof value.assistant_self_name === "string" &&
    typeof value.mutual_addressing_rule === "string" &&
    isStringArray(value.communication_style_preferences) &&
    typeof value.user_role === "string" &&
    typeof value.timezone === "string" &&
    isStringArray(value.interaction_boundaries) &&
    typeof value.long_term_background_summary === "string" &&
    typeof value.updated_at === "string"
  );
}

export async function loadUserIdentity(): Promise<UserIdentityProfile> {
  const response = await fetch(`${getBackendBaseURL()}/api/user-identity`);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load user identity (${response.status})`);
  }

  if (!isUserIdentityProfile(payload)) {
    throw new Error("Invalid user identity payload returned from loadUserIdentity");
  }

  return payload;
}

export async function patchUserIdentity(
  request: UserIdentityPatchRequest,
): Promise<UserIdentityProfile> {
  const response = await fetch(`${getBackendBaseURL()}/api/user-identity`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to update user identity (${response.status})`);
  }

  if (!isUserIdentityProfile(payload)) {
    throw new Error(
      "Invalid user identity payload returned from patchUserIdentity",
    );
  }

  return payload;
}

function isIdentityDocumentResponse(value: unknown): value is IdentityDocumentResponse {
  return isObjectRecord(value) && typeof value.document === "string";
}

export async function loadIdentityDocument(): Promise<IdentityDocumentResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/identity/document`);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load identity document (${response.status})`);
  }

  if (!isIdentityDocumentResponse(payload)) {
    throw new Error("Invalid identity document payload returned from loadIdentityDocument");
  }

  return payload;
}

export async function saveIdentityDocument(
  request: IdentityDocumentUpdateRequest,
): Promise<IdentityDocumentResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/identity/document`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to save identity document (${response.status})`);
  }

  if (!isIdentityDocumentResponse(payload)) {
    throw new Error("Invalid identity document payload returned from saveIdentityDocument");
  }

  return payload;
}
