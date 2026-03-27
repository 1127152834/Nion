import test from "node:test";
import assert from "node:assert/strict";

import nextConfig from "../next.config.js";

test("frontend dev rewrites proxy app APIs without nginx", async () => {
  const rewrites = await nextConfig.rewrites();

  assert.deepEqual(rewrites, [
    {
      source: "/api/langgraph/:path*",
      destination: "http://127.0.0.1:2024/:path*",
    },
    {
      source: "/api/:path*",
      destination: "http://127.0.0.1:8001/api/:path*",
    },
  ]);
});

test("frontend config no longer hard-forces static export", () => {
  assert.notEqual(nextConfig.output, "export");
});
