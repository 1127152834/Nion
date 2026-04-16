import { createRequire } from "node:module";
import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(import.meta.dirname, "..");
const frontendSrc = path.resolve(rootDir, "frontend", "src");
const rendererShims = path.resolve(import.meta.dirname, "src", "renderer", "shims");
const reactEntry = require.resolve("react/package.json");
const reactDomEntry = require.resolve("react-dom/package.json");
const reactJsxRuntimeEntry = require.resolve("react/jsx-runtime");
const reactJsxDevRuntimeEntry = require.resolve("react/jsx-dev-runtime");
const defineProcessEnv = {
  "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
  "process.env.NEXT_PUBLIC_BACKEND_BASE_URL": JSON.stringify(process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? ""),
  "process.env.NEXT_PUBLIC_LANGGRAPH_BASE_URL": JSON.stringify(process.env.NEXT_PUBLIC_LANGGRAPH_BASE_URL ?? ""),
  "process.env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY": JSON.stringify(process.env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY ?? ""),
  "process.env.GITHUB_OAUTH_TOKEN": JSON.stringify(process.env.GITHUB_OAUTH_TOKEN ?? ""),
  "process.env.SKIP_ENV_VALIDATION": JSON.stringify(process.env.SKIP_ENV_VALIDATION ?? ""),
};

export default defineConfig({
  plugins: [react()],
  define: defineProcessEnv,
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /^react$/, replacement: path.dirname(reactEntry) },
      { find: /^react\/jsx-runtime$/, replacement: reactJsxRuntimeEntry },
      { find: /^react\/jsx-dev-runtime$/, replacement: reactJsxDevRuntimeEntry },
      { find: /^react-dom$/, replacement: path.dirname(reactDomEntry) },
      { find: /^@\/env$/, replacement: path.resolve(rendererShims, "env.ts") },
      { find: /^next\/navigation$/, replacement: path.resolve(rendererShims, "next-navigation.ts") },
      { find: /^next\/link$/, replacement: path.resolve(rendererShims, "next-link.tsx") },
      { find: /^next\/image$/, replacement: path.resolve(rendererShims, "next-image.tsx") },
      { find: "@", replacement: frontendSrc },
    ],
  },
  build: {
    outDir: "renderer-dist",
    emptyOutDir: true,
  },
});
