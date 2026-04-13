import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  loadIdentityDocument,
  loadUserIdentity,
  patchUserIdentity,
  saveIdentityDocument,
} from "./api";
import type {
  IdentityDocumentResponse,
  IdentityDocumentUpdateRequest,
} from "./document-types";
import type {
  UserIdentityPatchRequest,
  UserIdentityProfile,
} from "./types";

const EMPTY_USER_IDENTITY: UserIdentityProfile = {
  version: "1.0",
  user_name: "",
  user_aliases: [],
  preferred_address_for_user: "",
  assistant_self_name: "",
  mutual_addressing_rule: "",
  communication_style_preferences: [],
  user_role: "",
  timezone: "",
  interaction_boundaries: [],
  long_term_background_summary: "",
  updated_at: "",
};

export function useUserIdentity() {
  const query = useQuery({
    queryKey: ["user-identity"],
    queryFn: () => loadUserIdentity(),
  });

  return {
    profile: query.data ?? EMPTY_USER_IDENTITY,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function usePatchUserIdentity() {
  const queryClient = useQueryClient();

  return useMutation<UserIdentityProfile, Error, UserIdentityPatchRequest>({
    mutationFn: (request) => patchUserIdentity(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-identity"] });
    },
  });
}

export function useIdentityDocument() {
  const query = useQuery({
    queryKey: ["identity-document"],
    queryFn: () => loadIdentityDocument(),
  });

  return {
    document: query.data?.document ?? "# Identity\n",
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useSaveIdentityDocument() {
  const queryClient = useQueryClient();

  return useMutation<IdentityDocumentResponse, Error, IdentityDocumentUpdateRequest>({
    mutationFn: (request) => saveIdentityDocument(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["identity-document"] });
      await queryClient.invalidateQueries({ queryKey: ["user-identity"] });
    },
  });
}
