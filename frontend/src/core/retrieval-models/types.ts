export interface RetrievalEmbeddingProfile {
  mode: "remote_managed";
  endpoint: string;
  model_name: string;
  dimensions: number;
  api_key_configured: boolean;
}

export interface RetrievalRerankerProfile {
  mode: "remote_managed";
  endpoint: string;
  model_name: string;
  api_key_configured: boolean;
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
  consumers: RetrievalModelsConsumerStatus[];
  capability: RetrievalCapabilitySnapshot;
}

export interface RetrievalEmbeddingSaveRequest {
  endpoint: string;
  api_key?: string;
  model_name: string;
  dimensions: number;
}

export interface RetrievalRerankerSaveRequest {
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
