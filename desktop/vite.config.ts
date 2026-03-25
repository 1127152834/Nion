import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.resolve(import.meta.dirname, "..");
const frontendSrc = path.resolve(rootDir, "frontend", "src");
const rendererShims = path.resolve(import.meta.dirname, "src", "renderer", "shims");
const rootNodeModules = path.resolve(rootDir, "node_modules");

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /^react$/, replacement: path.resolve(rootNodeModules, "react") },
      { find: /^react\/jsx-runtime$/, replacement: path.resolve(rootNodeModules, "react/jsx-runtime.js") },
      { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(rootNodeModules, "react/jsx-dev-runtime.js") },
      { find: /^react-dom$/, replacement: path.resolve(rootNodeModules, "react-dom") },
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
