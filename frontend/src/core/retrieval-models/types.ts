export interface RetrievalEmbeddingProfile {
  mode: "remote_managed";
  endpoint: string;
  model_name: string;
  dimensions: number;
}

export interface RetrievalRerankerProfile {
  mode: "local_managed" | "remote_managed";
  model_name: string;
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
}
