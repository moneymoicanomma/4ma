import type { MetadataRoute } from "next";

import { listBlogSitemapEntries } from "@/lib/server/blog";
import { publicSiteRoutes, siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticRoutes = publicSiteRoutes.map((route) => ({
    url: `${siteUrl}${route.href}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
  const blogRoutes = await listBlogSitemapEntries().catch(() => []);
  const dynamicRoutes = blogRoutes.map((route) => ({
    url: `${siteUrl}${route.href}`,
    lastModified: route.updatedAt,
    changeFrequency: "weekly" as const,
    priority: route.href.startsWith("/blog/tags/") ? 0.55 : route.href === "/blog" ? 0.85 : 0.75
  }));
  const routeMap = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const route of [...staticRoutes, ...dynamicRoutes]) {
    routeMap.set(route.url, route);
  }

  return Array.from(routeMap.values());
}
