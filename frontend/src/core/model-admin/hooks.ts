import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addProviderModels,
  createProviderInstance,
  deleteProviderInstance,
  deleteProviderModel,
  discoverProviderModels,
  loadProviderBindings,
  loadProviderInstances,
  loadProviderTemplates,
  testProviderInstance,
  testProviderModel,
  updateBinding,
  updateProviderInstance,
  updateProviderModel,
} from "./api";
import type {
  AddProviderModelsRequest,
  CreateProviderInstancePayload,
  ProviderCategory,
  ProviderExecutionPayload,
  UpdateBindingPayload,
  UpdateProviderInstancePayload,
  UpdateProviderModelPayload,
} from "./types";

function modelAdminQueryKeys() {
  return {
    templates: (category?: ProviderCategory) =>
      ["model-admin", "templates", category ?? "all"] as const,
    providers: ["model-admin", "providers"] as const,
    bindings: ["model-admin", "bindings"] as const,
  };
}

export function useProviderTemplates(category?: ProviderCategory) {
  return useQuery({
    queryKey: modelAdminQueryKeys().templates(category),
    queryFn: () => loadProviderTemplates({ category }),
  });
}

export function useProviderInstances() {
  return useQuery({
    queryKey: modelAdminQueryKeys().providers,
    queryFn: () => loadProviderInstances(),
  });
}

export function useProviderBindings() {
  return useQuery({
    queryKey: modelAdminQueryKeys().bindings,
    queryFn: () => loadProviderBindings(),
  });
}

export function useCreateProviderInstance() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: (payload: CreateProviderInstancePayload) =>
      createProviderInstance(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.providers });
      void queryClient.invalidateQueries({ queryKey: keys.bindings });
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useUpdateProviderInstance() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: ({
      providerId,
      payload,
    }: {
      providerId: string;
      payload: UpdateProviderInstancePayload;
    }) => updateProviderInstance(providerId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.providers });
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useDeleteProviderInstance() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: (providerId: string) => deleteProviderInstance(providerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.providers });
      void queryClient.invalidateQueries({ queryKey: keys.bindings });
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useTestProviderInstance() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: ({
      providerId,
      payload,
    }: {
      providerId: string;
      payload?: ProviderExecutionPayload;
    }) => testProviderInstance(providerId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.providers });
    },
  });
}

export function useDiscoverProviderModels() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: ({
      providerId,
      payload,
    }: {
      providerId: string;
      payload?: ProviderExecutionPayload;
    }) => discoverProviderModels(providerId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.providers });
    },
  });
}

export function useAddProviderModels() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: ({
      providerId,
      payload,
    }: {
      providerId: string;
      payload: AddProviderModelsRequest;
    }) => addProviderModels(providerId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.providers });
      void queryClient.invalidateQueries({ queryKey: keys.bindings });
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useUpdateProviderModel() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: ({
      modelId,
      payload,
    }: {
      modelId: string;
      payload: UpdateProviderModelPayload;
    }) => updateProviderModel(modelId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.providers });
      void queryClient.invalidateQueries({ queryKey: keys.bindings });
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useDeleteProviderModel() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: (modelId: string) => deleteProviderModel(modelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.providers });
      void queryClient.invalidateQueries({ queryKey: keys.bindings });
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useTestProviderModel() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: ({
      modelId,
      payload,
    }: {
      modelId: string;
      payload?: ProviderExecutionPayload;
    }) => testProviderModel(modelId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.providers });
    },
  });
}

export function useUpdateBinding() {
  const queryClient = useQueryClient();
  const keys = modelAdminQueryKeys();
  return useMutation({
    mutationFn: ({
      bindingKey,
      payload,
    }: {
      bindingKey: string;
      payload: UpdateBindingPayload;
    }) => updateBinding(bindingKey, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.bindings });
      void queryClient.invalidateQueries({ queryKey: keys.providers });
      void queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}
