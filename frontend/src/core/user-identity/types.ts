export interface UserIdentityProfile {
  version: string;
  user_name: string;
  user_aliases: string[];
  preferred_address_for_user: string;
  assistant_self_name: string;
  mutual_addressing_rule: string;
  communication_style_preferences: string[];
  user_role: string;
  timezone: string;
  interaction_boundaries: string[];
  long_term_background_summary: string;
  updated_at: string;
}

export type UserIdentityField =
  | "user_name"
  | "user_aliases"
  | "preferred_address_for_user"
  | "assistant_self_name"
  | "mutual_addressing_rule"
  | "communication_style_preferences"
  | "user_role"
  | "timezone"
  | "interaction_boundaries"
  | "long_term_background_summary";

export interface UserIdentityPatchRequest {
  field: UserIdentityField;
  value: string | string[];
}
