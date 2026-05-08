import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminTopbar } from "@/app/components/admin-topbar";
import { BlogAdminDashboard } from "@/app/components/blog-admin-dashboard";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { canAccessBlogAdmin, getAdminDefaultRedirectPathForRole } from "@/lib/server/admin-access";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";
import { listAdminBlogPosts, listBlogTagSuggestions } from "@/lib/server/blog";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Admin Blog | Money Moicano MMA",
  description: "Painel editorial para criar, editar e publicar posts do Money Moicano MMA.",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const identity = await requireAdminSessionIdentity("/admin/blog");

  if (!canAccessBlogAdmin(identity.role)) {
    redirect(getAdminDefaultRedirectPathForRole(identity.role));
  }

  const [posts, tags] = await Promise.all([listAdminBlogPosts(), listBlogTagSuggestions()]);
  const publishedCount = posts.filter((post) => post.status === "published").length;
  const draftCount = posts.length - publishedCount;

  return (
    <main className={styles.page}>
      <LandingMotionController />
      <AdminTopbar active="blog" role={identity.role} />

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-reveal>
            <p className={styles.eyebrow}>Redacao</p>
            <h1 className={styles.title}>
              Admin do
              <span className={styles.titleAccent}>Blog</span>
            </h1>
            <p className={styles.heroBody}>
              Crie materias, organize tags, publique destaques e mantenha a camada de SEO pronta
              para Google e buscas assistidas por IA.
            </p>
          </div>

          <div className={styles.heroAside} data-reveal>
            <div className={styles.heroMetric}>
              <span>Publicados</span>
              <strong>{publishedCount}</strong>
            </div>
            <div className={styles.heroMetric}>
              <span>Rascunhos</span>
              <strong>{draftCount}</strong>
            </div>
            <div className={styles.heroMetric}>
              <span>Tags</span>
              <strong>{tags.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.dashboardSection}>
        <div className={styles.dashboardShell} data-reveal>
          <BlogAdminDashboard initialPosts={posts} initialTags={tags} />
        </div>
      </section>
    </main>
  );
}
