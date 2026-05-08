import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { normalizeBlogSlug } from "@/lib/contracts/blog";
import { createPageMetadata } from "@/lib/seo";
import { listPublicBlogPostsByTag } from "@/lib/server/blog";
import { siteAsset } from "@/lib/site-assets";

import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

const brandLogoWide = siteAsset("logo money moicano mma extenso.svg");

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Sem data"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

export async function generateMetadata({
  params
}: Readonly<{
  params: Promise<{ tagSlug: string }>;
}>): Promise<Metadata> {
  const { tagSlug } = await params;
  const result = await listPublicBlogPostsByTag(normalizeBlogSlug(tagSlug));

  if (!result) {
    return {
      title: "Tag nao encontrada | Money Moicano MMA",
      robots: { index: false, follow: false }
    };
  }

  return createPageMetadata({
    path: `/blog/tags/${result.tag.slug}`,
    title: `${result.tag.name} | Blog Money Moicano MMA`,
    description: `Posts publicados sobre ${result.tag.name} no blog do Money Moicano MMA.`,
    keywords: [result.tag.name, "blog MMA", "Money Moicano MMA"]
  });
}

export default async function BlogTagPage({
  params
}: Readonly<{
  params: Promise<{ tagSlug: string }>;
}>) {
  const { tagSlug } = await params;
  const result = await listPublicBlogPostsByTag(normalizeBlogSlug(tagSlug));

  if (!result) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link aria-label="Money Moicano MMA" className={styles.brand} href="/">
          <img alt="Money Moicano MMA" src={brandLogoWide} />
        </Link>
        <nav aria-label="Navegacao do blog" className={styles.nav}>
          <Link href="/">Evento</Link>
          <Link href="/blog">Blog</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Tag</p>
          <h1>{result.tag.name}</h1>
          <p>Posts publicados no blog do Money Moicano MMA com esta tag.</p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.contentGrid}>
          <div className={styles.feed}>
            <section className={styles.postSection}>
              <span className={styles.sectionLabel}>Ordem cronologica</span>
              <div className={styles.postList}>
                {result.posts.map((post) => (
                  <article className={styles.postCard} key={post.id}>
                    <Link className={styles.postImage} href={`/blog/${post.slug}`}>
                      {post.coverUrl ? <img alt={post.coverAltText || post.title} src={post.coverUrl} /> : null}
                    </Link>
                    <div className={styles.postBody}>
                      <div className={styles.postMeta}>
                        <span>{formatDate(post.publishedAt)}</span>
                        <span>{post.readingTimeMinutes} min</span>
                      </div>
                      <h2>
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h2>
                      <p>{post.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <h2>Tag atual</h2>
            <div className={styles.tagFilter}>
              <Link href={`/blog/tags/${result.tag.slug}`}>
                <span>{result.tag.name}</span>
                <strong>{result.posts.length}</strong>
              </Link>
            </div>
            <p>
              <Link href="/blog">Voltar para todos os posts</Link>
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
