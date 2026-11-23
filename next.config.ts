import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  outputFileTracingExcludes: {
    "*": [
      "./public/assets/**",
      "./data/uploads/**",
      "./.impeccable/**",
      "./tmp/**",
      "./tests/**",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
