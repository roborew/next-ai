import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The e2e server runs alongside `next dev` with its own build directory. */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
