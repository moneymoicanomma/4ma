import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LandingTopbar } from "@/app/components/landing-topbar";
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

const brandLogo = siteAsset("logo money moicano mma.svg");
const fighterSignupLogo = "https://assets.moneymoicanomma.com.br/rinha-de-inscritos.svg";
const fighterSignupUrl = "https://mma.moicano.tv/";

const navItems = [
  { label: "Blog", href: "/blog", sectionId: "blog" },
  { label: "O Evento", href: "/#evento", sectionId: "evento" },
  { label: "A Transmissão", href: "/#transmissao", sectionId: "transmissao" },
  { label: "Lute no MMMMA", href: "/lute-no-mmmma", sectionId: "lute-no-mmmma" },
  { label: "Ingressos", href: "/#ingressos", sectionId: "ingressos" }
] as const;

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
    <main className={styles.page} data-nav-section="blog">
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLdForScript(jsonLd) }}
        type="application/ld+json"
      />

      <LandingTopbar
        brandLogo={brandLogo}
        navItems={navItems}
        ctaHref={fighterSignupUrl}
        ctaLabel="Lute na Rinha de Inscritos"
        ctaLogoSrc={fighterSignupLogo}
      />

      <article className={styles.article}>
        <header className={styles.hero}>
          {post.coverUrl ? (
            <img
              alt=""
              aria-hidden="true"
              className={styles.heroImage}
              src={post.coverUrl}
            />
          ) : null}
          <div className={styles.heroOverlay} />

          <div className={styles.heroInner}>
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

            {post.coverCaption ? <p className={styles.heroCaption}>{post.coverCaption}</p> : null}
          </div>
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
