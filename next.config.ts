import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev"
      }
    ]
  }
};

export default nextConfig;
