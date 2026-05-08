import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BlogBlocks } from "@/lib/blog/rendering";
import {
  createBlogPostJsonLd,
  createBlogPostMetadata,
  serializeJsonLdForScript
} from "@/lib/blog/metadata";
import { normalizeBlogSlug } from "@/lib/contracts/blog";
import { getBlogRedirectForSlug, getPublicBlogPostBySlug } from "@/lib/server/blog";
import { siteAsset } from "@/lib/site-assets";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const brandLogoWide = siteAsset("logo money moicano mma extenso.svg");

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Sem data"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

async function resolvePost(slug: string) {
  const normalizedSlug = normalizeBlogSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  return getPublicBlogPostBySlug(normalizedSlug);
}

export async function generateMetadata({
  params
}: Readonly<{
  params: Promise<{ slug: string }>;
}>): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug);

  if (!post) {
    return {
      title: "Post nao encontrado | Money Moicano MMA",
      robots: { index: false, follow: false }
    };
  }

  return createBlogPostMetadata(post);
}

export default async function BlogPostPage({
  params
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const normalizedSlug = normalizeBlogSlug(slug);

  if (!normalizedSlug) {
    notFound();
  }

  const post = await getPublicBlogPostBySlug(normalizedSlug);

  if (!post) {
    const redirectSlug = await getBlogRedirectForSlug(normalizedSlug);

    if (redirectSlug) {
      redirect(`/blog/${redirectSlug}`);
    }

    notFound();
  }

  const jsonLd = createBlogPostJsonLd(post);

  return (
    <main className={styles.page}>
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLdForScript(jsonLd) }}
        type="application/ld+json"
      />

      <header className={styles.topbar}>
        <Link aria-label="Money Moicano MMA" className={styles.brand} href="/">
          <img alt="Money Moicano MMA" src={brandLogoWide} />
        </Link>
        <nav aria-label="Navegacao do blog" className={styles.nav}>
          <Link href="/">Evento</Link>
          <Link href="/blog">Blog</Link>
        </nav>
      </header>

      <article className={styles.article}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <Link className={styles.backLink} href="/blog">
              Blog
            </Link>
            <h1>{post.title}</h1>
            <p>{post.description}</p>
            <div className={styles.meta}>
              <span>{post.authorName}</span>
              <span>{formatDate(post.publishedAt)}</span>
              <span>{post.readingTimeMinutes} min</span>
            </div>
          </div>

          <figure className={styles.cover}>
            {post.coverUrl ? <img alt={post.coverAltText || post.title} src={post.coverUrl} /> : null}
            {post.coverCaption ? <figcaption>{post.coverCaption}</figcaption> : null}
          </figure>
        </header>

        <div className={styles.bodyGrid}>
          <div className={styles.content}>
            <BlogBlocks blocks={post.contentBlocks} />
          </div>

          <aside className={styles.sidebar}>
            <h2>Tags</h2>
            <div className={styles.tagList}>
              {post.tags.map((tag) => (
                <Link href={`/blog/tags/${tag.slug}`} key={tag.slug}>
                  {tag.name}
                </Link>
              ))}
            </div>
            <Link className={styles.markdownLink} href={`/blog/${post.slug}.md`}>
              Versao Markdown
            </Link>
          </aside>
        </div>
      </article>
    </main>
  );
}
