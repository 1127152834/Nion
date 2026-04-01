import { useMutation } from "@tanstack/react-query";

import {
  attachNotebookNoteToProject,
  createMemoryCandidatesFromNotebook,
  createMemoryCandidatesFromProject,
  createProjectConstraintCandidatesFromNotebook,
  createProjectDraftFromNotebook,
  createNotebookDraftFromProject,
  createProjectPlanDraftFromNotebook,
  createSkillCandidatesFromProject,
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

export function useCreateNotebookDraftFromProject(projectId: string) {
  return useMutation({
    mutationFn: (input: Parameters<typeof createNotebookDraftFromProject>[1]) =>
      createNotebookDraftFromProject(projectId, input),
  });
}

export function useCreateMemoryCandidatesFromProject(projectId: string) {
  return useMutation({
    mutationFn: (input: Parameters<typeof createMemoryCandidatesFromProject>[1]) =>
      createMemoryCandidatesFromProject(projectId, input),
  });
}

export function useCreateSkillCandidatesFromProject(projectId: string) {
  return useMutation({
    mutationFn: (input: Parameters<typeof createSkillCandidatesFromProject>[1]) =>
      createSkillCandidatesFromProject(projectId, input),
  });
}

export function useAttachNotebookNoteToProject(projectId: string) {
  return useMutation({
    mutationFn: (input: Parameters<typeof attachNotebookNoteToProject>[1]) =>
      attachNotebookNoteToProject(projectId, input),
  });
}
