import type { Metadata } from "next";

import type { BlogPostDetail } from "@/lib/contracts/blog";
import { defaultOgImagePath, siteLanguage, siteName, siteUrl, xHandle } from "@/lib/site";

function resolveUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `${siteUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

export function createBlogPostMetadata(post: BlogPostDetail): Metadata {
  const title = post.seoTitle || `${post.title} | ${siteName}`;
  const description = post.seoDescription || post.description;
  const canonical = post.canonicalUrlOverride || `/blog/${post.slug}`;
  const image = post.coverUrl || defaultOgImagePath;
  const imageAlt = post.coverAltText || post.title;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: !post.noindex,
      follow: !post.noindex,
      googleBot: {
        index: !post.noindex,
        follow: !post.noindex,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    openGraph: {
      type: "article",
      siteName,
      title: post.socialTitle || title,
      description: post.socialDescription || description,
      url: canonical,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      tags: post.tags.map((tag) => tag.name),
      images: [{ url: image, alt: imageAlt }]
    },
    twitter: {
      card: "summary_large_image",
      title: post.socialTitle || title,
      description: post.socialDescription || description,
      creator: xHandle,
      site: xHandle,
      images: [image]
    }
  };
}

export function createBlogPostJsonLd(post: BlogPostDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: [resolveUrl(post.coverUrl || defaultOgImagePath)],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: post.authorName
    },
    publisher: {
      "@type": "Organization",
      name: siteName
    },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    inLanguage: siteLanguage,
    keywords: post.tags.map((tag) => tag.name).join(", ")
  };
}
