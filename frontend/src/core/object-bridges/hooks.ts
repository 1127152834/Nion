import { useMutation } from "@tanstack/react-query";

import {
  createMemoryCandidatesFromNotebook,
  createProjectConstraintCandidatesFromNotebook,
  createProjectDraftFromNotebook,
  createProjectPlanDraftFromNotebook,
} from "./api";

export function useCreateProjectDraftFromNotebook() {
  return useMutation({ mutationFn: createProjectDraftFromNotebook });
}

export function useCreateProjectPlanDraftFromNotebook() {
  return useMutation({ mutationFn: createProjectPlanDraftFromNotebook });
}

export function useCreateProjectConstraintCandidatesFromNotebook() {
  return useMutation({ mutationFn: createProjectConstraintCandidatesFromNotebook });
}

export function useCreateMemoryCandidatesFromNotebook() {
  return useMutation({ mutationFn: createMemoryCandidatesFromNotebook });
}
