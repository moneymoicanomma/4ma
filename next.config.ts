import type { NextConfig } from "next";

const repoRoot = process.cwd();

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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev"
      },
      {
        protocol: "https",
        hostname: "moneymoicanomma.com.br"
      }
    ]
  }
};

export default nextConfig;
