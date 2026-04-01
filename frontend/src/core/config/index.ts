import { env } from "../../env.js";

function getDesktopRuntimeBackendBaseURL(): string {
  if (
    typeof window !== "undefined" &&
    typeof window.__NION_BACKEND_BASE_URL__ === "string" &&
    window.__NION_BACKEND_BASE_URL__.length > 0
  ) {
    return window.__NION_BACKEND_BASE_URL__;
  }

  if (
    typeof window !== "undefined" &&
    typeof window.nionDesktop?.backendBaseUrl === "string" &&
    window.nionDesktop.backendBaseUrl.length > 0
  ) {
    return window.nionDesktop.backendBaseUrl;
  }

  return "";
}

export function getBackendBaseURL() {
  const desktopRuntimeUrl = getDesktopRuntimeBackendBaseURL();
  if (desktopRuntimeUrl) {
    return desktopRuntimeUrl;
  } else if (
    typeof window !== "undefined" &&
    window.location.protocol === "nion:"
  ) {
    return "http://127.0.0.1:43115";
  } else if (env.NEXT_PUBLIC_BACKEND_BASE_URL) {
    return env.NEXT_PUBLIC_BACKEND_BASE_URL;
  } else if (
    typeof window !== "undefined" &&
    (window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost")
  ) {
    if (typeof window.nionDesktop !== "undefined") {
      return "http://localhost:8001";
    }
    return "http://localhost:8001";
  } else {
    return "";
  }
}

export function getLangGraphBaseURL(isMock?: boolean) {
  const desktopRuntimeUrl = getDesktopRuntimeBackendBaseURL();
  if (desktopRuntimeUrl) {
    return `${desktopRuntimeUrl}/api/langgraph`;
  }

  if (env.NEXT_PUBLIC_LANGGRAPH_BASE_URL) {
    return env.NEXT_PUBLIC_LANGGRAPH_BASE_URL;
  } else if (isMock) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/mock/api`;
    }
    return "http://localhost:3000/mock/api";
  } else {
    if (
      typeof window !== "undefined" &&
      typeof window.nionDesktop !== "undefined"
    ) {
      return "http://localhost:2024";
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/langgraph`;
    }
    return "http://localhost:2026/api/langgraph";
  }
}
