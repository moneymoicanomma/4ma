import type { Metadata } from "next";
import Link from "next/link";

import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { LandingTopbar } from "@/app/components/landing-topbar";
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

const brandLogo = siteAsset("logo money moicano mma.svg");
const fighterSignupLogo = "https://assets.moneymoicanomma.com.br/rinha-de-inscritos.svg";
const fighterSignupUrl = "https://mma.moicano.tv/";

const blogNavItems = [
  { label: "Notícias", href: "/blog", sectionId: "blog" },
  { label: "O Evento", href: "/#evento", sectionId: "evento" },
  { label: "A Transmissão", href: "/#transmissao", sectionId: "transmissao" },
  { label: "Lute no MMMMA", href: "/lute-no-mmmma", sectionId: "lute-no-mmmma" },
  { label: "Ingressos", href: "/#ingressos", sectionId: "ingressos" }
] as const;

type PublicBlogPost = Awaited<ReturnType<typeof listPublicBlogPosts>>["posts"][number];

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Sem data"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

function getPostKicker(post: PublicBlogPost) {
  return post.tags[0]?.name ?? "Notícias";
}

function MainStory({ post }: Readonly<{ post: PublicBlogPost | null }>) {
  if (!post) {
    return (
      <section className={styles.emptyLead} data-reveal>
        <span className={styles.kicker}>Blog oficial</span>
        <h1>Nenhum post publicado ainda</h1>
        <p>A redação ainda não publicou posts. Quando sair conteúdo, ele aparece aqui.</p>
      </section>
    );
  }

  return (
    <article className={styles.mainStory} data-reveal>
      <Link className={styles.mainMedia} href={`/blog/${post.slug}`}>
        {post.coverUrl ? (
          <img alt={post.coverAltText || post.title} src={post.coverUrl} />
        ) : (
          <span>Money Moicano MMA</span>
        )}
      </Link>

      <div className={styles.storyPanel}>
        <span className={styles.kicker}>{getPostKicker(post)}</span>
        <h1>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h1>
        <p>{post.description}</p>
        <div className={styles.storyMeta}>
          <span>{formatDate(post.publishedAt)}</span>
          <span>{post.readingTimeMinutes} min</span>
        </div>
        <div className={styles.storyActions}>
          <Link className={styles.primaryAction} href={`/blog/${post.slug}`}>
            Leia mais
          </Link>
          <Link className={styles.secondaryAction} href="#ultimas">
            Últimas notícias
          </Link>
        </div>
      </div>
    </article>
  );
}

function HighlightList({ posts }: Readonly<{ posts: PublicBlogPost[] }>) {
  return (
    <aside className={styles.highlights} data-reveal>
      <h2>Em destaque</h2>
      {posts.length ? (
        <ol className={styles.highlightList}>
          {posts.slice(0, 7).map((post, index) => (
            <li key={post.id}>
              <Link href={`/blog/${post.slug}`}>
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.highlightCopy}>
                  <small>{getPostKicker(post)}</small>
                  <strong>{post.title}</strong>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.sidebarEmpty}>Nenhum destaque publicado ainda.</p>
      )}
    </aside>
  );
}

function NewsCard({ post }: Readonly<{ post: PublicBlogPost }>) {
  return (
    <article className={styles.newsCard}>
      <Link className={styles.newsImage} href={`/blog/${post.slug}`}>
        {post.coverUrl ? <img alt={post.coverAltText || post.title} src={post.coverUrl} /> : null}
      </Link>
      <div className={styles.newsBody}>
        <div className={styles.newsMeta}>
          <span>{getPostKicker(post)}</span>
          <span>{formatDate(post.publishedAt)}</span>
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
  const mainPost = featured ?? posts[0] ?? null;
  const chronologicalPosts = mainPost
    ? posts.filter((post) => post.id !== mainPost.id)
    : posts;
  const highlightPosts = [mainPost, ...chronologicalPosts].filter(
    (post): post is PublicBlogPost => Boolean(post)
  );

  return (
    <main className={styles.page} data-nav-section="blog" id="blog">
      <LandingMotionController />
      <LandingTopbar
        brandLogo={brandLogo}
        navItems={blogNavItems}
        ctaHref={fighterSignupUrl}
        ctaLabel="Lute na Rinha de Inscritos"
        ctaLogoSrc={fighterSignupLogo}
      />

      <section className={styles.newsroom}>
        <div className={styles.leadGrid}>
          <MainStory post={mainPost} />
          <HighlightList posts={highlightPosts} />
        </div>

        <section className={styles.latestSection} data-reveal id="ultimas">
          <div className={styles.sectionHeader}>
            <span>Últimas notícias</span>
            <Link href="/blog">Ver tudo</Link>
          </div>
          {chronologicalPosts.length ? (
            <div className={styles.newsGrid}>
              {chronologicalPosts.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          ) : mainPost ? (
            <div className={styles.emptyStrip}>
              <p>Mais posts entram aqui assim que a redação publicar novas matérias.</p>
            </div>
          ) : null}
        </section>

        {tags.length ? (
          <section className={styles.tagsSection} data-reveal>
            <div className={styles.sectionHeader}>
              <span>Tags</span>
            </div>
            <div className={styles.tagFilter}>
              {tags.map((tag) => (
                <Link href={`/blog/tags/${tag.slug}`} key={tag.slug}>
                  <span>{tag.name}</span>
                  <strong>{tag.count}</strong>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
