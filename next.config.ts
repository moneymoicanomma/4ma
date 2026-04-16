import type { NextConfig } from "next";

import { getSiteAssetRemotePatterns } from "./lib/site-assets";

const repoRoot = process.cwd();
const siteAssetRemotePatterns = getSiteAssetRemotePatterns();
const defaultConnectSrcOrigins = [
  "'self'",
  "https://assets.moneymoicanomma.com.br",
  "https://va.vercel-scripts.com",
  "https://*.vercel-insights.com",
  "https://challenges.cloudflare.com",
  "https://use.typekit.net",
  "https://p.typekit.net",
  "https://*.r2.cloudflarestorage.com"
] as const;

function resolveOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    try {
      return new URL(`https://${value}`).origin;
    } catch {
      return null;
    }
  }
}

function getConnectSrcOrigins() {
  const origins = new Set<string>(defaultConnectSrcOrigins);

  for (const candidate of [
    process.env.NEXT_PUBLIC_SITE_ASSET_BASE_URL,
    process.env.FIGHTER_PHOTOS_S3_ENDPOINT
  ]) {
    const origin = candidate ? resolveOrigin(candidate) : null;

    if (origin) {
      origins.add(origin);
    }
  }

  return Array.from(origins);
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://*.vercel-insights.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
  "style-src-elem 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
  "font-src 'self' data: https://use.typekit.net https://p.typekit.net",
  "img-src 'self' data: blob: https:",
  `connect-src ${getConnectSrcOrigins().join(" ")}`,
  "frame-src 'self' https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups"
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site"
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1"
  },
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
  poweredByHeader: false,
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
    deviceSizes: [360, 390, 414, 535, 640, 750, 828, 960, 1080, 1200, 1273, 1366, 1440, 1600, 1920],
    imageSizes: [21, 23, 24, 30, 32, 46, 58, 88, 180, 220, 283, 319, 352],
    formats: ["image/avif", "image/webp"],
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
