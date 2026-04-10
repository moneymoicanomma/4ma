import type { MetadataRoute } from "next";

import { publicSiteRoutes, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicSiteRoutes.map((route) => ({
    url: `${siteUrl}${route.href}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
