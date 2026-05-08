import { notFound } from "next/navigation";

import { normalizeBlogSlug } from "@/lib/contracts/blog";
import { getPublicBlogPostBySlug } from "@/lib/server/blog";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(normalizeBlogSlug(slug));

  if (!post) {
    notFound();
  }

  const body = [
    `# ${post.title}`,
    post.description,
    `Autor: ${post.authorName}`,
    post.publishedAt ? `Publicado: ${post.publishedAt}` : "",
    `Tags: ${post.tags.map((tag) => tag.name).join(", ")}`,
    `Canonical: ${siteUrl}/blog/${post.slug}`,
    post.markdown
  ]
    .filter(Boolean)
    .join("\n\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
