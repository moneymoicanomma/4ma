import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminTopbar } from "@/app/components/admin-topbar";
import { BlogPostEditor } from "@/app/components/blog-post-editor";
import { canAccessBlogAdmin, getAdminDefaultRedirectPathForRole } from "@/lib/server/admin-access";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";
import { canReadBlogAdminData, getAdminBlogPost, listBlogTagSuggestions } from "@/lib/server/blog";
import { getServerEnv } from "@/lib/server/env";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Editar post | Money Moicano MMA",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function AdminBlogPostPage({
  params
}: Readonly<{
  params: Promise<{ postId: string }>;
}>) {
  const { postId } = await params;
  const env = getServerEnv();
  const identity = await requireAdminSessionIdentity(`/admin/blog/${postId}`, env);

  if (!canAccessBlogAdmin(identity.role)) {
    redirect(getAdminDefaultRedirectPathForRole(identity.role));
  }

  if (!canReadBlogAdminData(env)) {
    redirect("/admin/blog");
  }

  const [post, tags] = await Promise.all([getAdminBlogPost(postId, env), listBlogTagSuggestions(env)]);

  if (!post) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <AdminTopbar active="blog" role={identity.role} />
      <BlogPostEditor initialPost={post} tagSuggestions={tags} />
    </main>
  );
}
