import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  reactCompiler: true,
  turbopack: {
    resolveExtensions: [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".json",
      ".cjs",
      ".mjs",
      ".css",
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
