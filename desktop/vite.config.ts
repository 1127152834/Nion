import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.resolve(import.meta.dirname, "..");
const frontendSrc = path.resolve(rootDir, "frontend", "src");
const rendererShims = path.resolve(import.meta.dirname, "src", "renderer", "shims");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
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
