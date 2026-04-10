import type { MetadataRoute } from "next";

import { publicSiteRoutes, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: publicSiteRoutes.map((route) => route.href),
      disallow: ["/admin", "/atletas-da-edicao", "/api"]
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
