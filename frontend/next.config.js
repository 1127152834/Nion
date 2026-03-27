/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

const isStaticExport = process.env.NION_STATIC_EXPORT === "1";

/** @type {import("next").NextConfig} */
const config = {
  devIndicators: false,
  ...(isStaticExport ? { output: "export" } : {}),
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/langgraph/:path*",
        destination: "http://127.0.0.1:2024/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8001/api/:path*",
      },
    ];
  },
};

export default config;
