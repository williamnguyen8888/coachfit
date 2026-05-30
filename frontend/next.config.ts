import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  },

  // Recommended for PWA — prevents Next.js from injecting extra meta tags
  poweredByHeader: false,

  // Enable experimental features for Next.js 15
  experimental: {
    // Optimize package imports for lucide-react
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
