export interface RetrievalEmbeddingProfile {
  provider: "local_onnx" | "openai_compatible";
  model_id?: string | null;
  endpoint: string;
  model_name: string;
  dimensions: number;
  api_key_configured: boolean;
  display_name?: string | null;
}

export interface RetrievalRerankerProfile {
  provider: "local_onnx" | "rerank_api";
  model_id?: string | null;
  endpoint: string;
  model_name: string;
  api_key_configured: boolean;
  display_name?: string | null;
}

export interface RetrievalLocalModelItem {
  model_id: string;
  family: "embedding" | "rerank";
  display_name: string;
  locale: string;
  installed: boolean;
  downloading: boolean;
}

export interface RetrievalRecommendedProfile {
  profile_id: string;
  label: string;
  mode: "local" | "remote";
  embedding_model_id: string | null;
  reranker_model_id: string | null;
}

export interface RetrievalDesktopModelActionResult {
  success: boolean;
  message: string;
}

export interface RetrievalCapabilitySnapshot {
  local_prepare_enabled: boolean;
  remote_config_enabled: boolean;
  test_enabled: boolean;
  rebuild_enabled: boolean;
  status_only: boolean;
}

export interface RetrievalModelsConsumerStatus {
  consumer_id: string;
  label: string;
  index_state: string;
  rebuild_required: boolean;
}

export interface RetrievalModelsStatusResponse {
  active_profile: {
    embedding: RetrievalEmbeddingProfile;
    reranker: RetrievalRerankerProfile;
  };
  local_models: {
    embedding: RetrievalLocalModelItem[];
    rerank: RetrievalLocalModelItem[];
  };
  recommended_profiles: RetrievalRecommendedProfile[];
  consumers: RetrievalModelsConsumerStatus[];
  capability: RetrievalCapabilitySnapshot;
}

export interface RetrievalEmbeddingSaveRequest {
  provider?: "local_onnx" | "openai_compatible";
  model_id?: string | null;
  endpoint: string;
  api_key?: string;
  model_name: string;
  dimensions: number;
}

export interface RetrievalRerankerSaveRequest {
  provider?: "local_onnx" | "rerank_api";
  model_id?: string | null;
  endpoint: string;
  api_key?: string;
  model_name: string;
}

export interface SaveRetrievalModelsProfileRequest {
  embedding: RetrievalEmbeddingSaveRequest;
  reranker: RetrievalRerankerSaveRequest;
}

export interface TestRetrievalEmbeddingRequest {
  endpoint: string;
  api_key: string;
  model_name: string;
  probe_text?: string;
}

export interface TestRetrievalEmbeddingResult {
  ok: boolean;
  vector_size: number;
  message: string;
}

export interface TestRetrievalRerankerRequest {
  endpoint: string;
  api_key: string;
  model_name: string;
  query?: string;
  documents?: string[];
}

export interface TestRetrievalRerankerResult {
  ok: boolean;
  top_document_index: number;
  top_score: number;
  message: string;
}

export interface RebuildRetrievalConsumersResult {
  accepted: string[];
  results: Array<{
    consumer_id: string;
    status: string;
    detail?: string;
    record_count?: number;
  }>;
  message: string;
}
