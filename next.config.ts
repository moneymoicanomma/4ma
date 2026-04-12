import type { NextConfig } from "next";

import { getSiteAssetRemotePatterns } from "./lib/site-assets";

const repoRoot = process.cwd();
const siteAssetRemotePatterns = getSiteAssetRemotePatterns();

const securityHeaders = [
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN"
  }
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      ...siteAssetRemotePatterns,
      {
        protocol: "https",
        hostname: "moneymoicanomma.com.br"
      }
    ]
  }
};

export default nextConfig;
