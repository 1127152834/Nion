import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadUserIdentity, patchUserIdentity } from "./api";
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
