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

const landingAssetCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable"
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
        source: "/assets/landing/:path*",
        headers: landingAssetCacheHeaders
      },
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  },
  images: {
    deviceSizes: [360, 390, 414, 535, 640, 750, 828, 960, 1080, 1200, 1273, 1366, 1440, 1600, 1920],
    imageSizes: [21, 23, 24, 30, 32, 46, 58, 88, 180, 220, 283, 319, 352],
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      {
        pathname: "/assets/landing/**",
        search: "?v=20260412"
      }
    ],
    minimumCacheTTL: 31536000,
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
