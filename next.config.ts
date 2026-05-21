import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 400,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/agent-ctx/**",
          "**/upload/**",
          "**/download/**",
          "**/examples/**",
          "**/.cursor/**",
          "**/skills/**",
          "**/*.md",
          "**/dev.log",
          "**/server.log",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
