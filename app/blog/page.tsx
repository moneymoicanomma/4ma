import type { Metadata } from "next";
import Link from "next/link";

import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { createPageMetadata } from "@/lib/seo";
import { listPublicBlogPosts } from "@/lib/server/blog";
import { siteAsset } from "@/lib/site-assets";

import styles from "./page.module.css";

export const metadata: Metadata = createPageMetadata({
  path: "/blog",
  title: "Blog | Money Moicano MMA",
  description:
    "Materias, bastidores, analises e atualizacoes oficiais do Money Moicano MMA.",
  keywords: ["blog Money Moicano MMA", "noticias MMA", "bastidores MMA", "Renato Moicano"]
});

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

function PostCard({
  post,
  featured = false
}: Readonly<{
  post: Awaited<ReturnType<typeof listPublicBlogPosts>>["posts"][number];
  featured?: boolean;
}>) {
  return (
    <article className={featured ? `${styles.postCard} ${styles.featuredCard}` : styles.postCard}>
      <Link className={styles.postImage} href={`/blog/${post.slug}`}>
        {post.coverUrl ? <img alt={post.coverAltText || post.title} src={post.coverUrl} /> : null}
      </Link>
      <div className={styles.postBody}>
        <div className={styles.postMeta}>
          <span>{formatDate(post.publishedAt)}</span>
          <span>{post.readingTimeMinutes} min</span>
          {post.isFeatured ? <span>Destaque</span> : null}
        </div>
        <h2>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.description}</p>
        <div className={styles.tagList}>
          {post.tags.map((tag) => (
            <Link href={`/blog/tags/${tag.slug}`} key={tag.slug}>
              {tag.name}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

export default async function BlogPage() {
  const { featured, posts, tags } = await listPublicBlogPosts();
  const chronologicalPosts = featured ? posts : posts;

  return (
    <main className={styles.page}>
      <LandingMotionController />

      <header className={styles.topbar}>
        <Link aria-label="Money Moicano MMA" className={styles.brand} href="/">
          <img alt="Money Moicano MMA" src={brandLogoWide} />
        </Link>
        <nav aria-label="Navegacao do blog" className={styles.nav}>
          <Link href="/">Evento</Link>
          <Link href="/fantasy">Fantasy</Link>
          <Link href="/blog">Blog</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy} data-reveal>
          <p className={styles.eyebrow}>Blog oficial</p>
          <h1>Money Moicano MMA</h1>
          <p>
            Materias, bastidores e analises para acompanhar o evento com mais contexto antes,
            durante e depois das lutas.
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.contentGrid}>
          <div className={styles.feed} data-reveal>
            {featured ? (
              <section className={styles.featuredSection}>
                <span className={styles.sectionLabel}>Post em destaque</span>
                <PostCard featured post={featured} />
              </section>
            ) : null}

            <section className={styles.postSection}>
              <span className={styles.sectionLabel}>Ordem cronologica</span>
              {chronologicalPosts.length ? (
                <div className={styles.postList}>
                  {chronologicalPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <h2>Nenhum post publicado ainda</h2>
                  <p>A redacao ainda nao publicou posts. Quando sair conteudo, ele aparece aqui.</p>
                </div>
              )}
            </section>
          </div>

          <aside className={styles.sidebar} data-reveal>
            <h2>Filtrar por tag</h2>
            {tags.length ? (
              <div className={styles.tagFilter}>
                {tags.map((tag) => (
                  <Link href={`/blog/tags/${tag.slug}`} key={tag.slug}>
                    <span>{tag.name}</span>
                    <strong>{tag.count}</strong>
                  </Link>
                ))}
              </div>
            ) : (
              <p>Nenhuma tag publicada ainda.</p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
