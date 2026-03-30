declare global {
  interface Window {
    __NION_BACKEND_BASE_URL__?: string;
    nionDesktop?: {
      backendBaseUrl?: string;
      getRuntimeInfo?: () => Promise<{
        baseUrl?: string | null;
        clientId?: string | null;
      }>;
    };
  }
}

export {};
