"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import type { BlogPostStatus, BlogPostSummary } from "@/lib/contracts/blog";

import styles from "./blog-admin-dashboard.module.css";

type BlogAdminDashboardProps = {
  initialPosts: BlogPostSummary[];
  initialTags: Array<{ name: string; slug: string; count: number }>;
};

type BlogPostCreateResponse =
  | {
      ok: true;
      postId: string;
    }
  | {
      ok: false;
      message: string;
    };

type BlogPostDeleteResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

type FilterState = {
  query: string;
  status: "all" | BlogPostStatus;
  tag: string;
  author: string;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Data indefinida" : dateFormatter.format(date);
}

function getStatusLabel(status: BlogPostStatus) {
  return status === "published" ? "Publicado" : "Rascunho";
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function BlogAdminDashboard({
  initialPosts,
  initialTags
}: Readonly<BlogAdminDashboardProps>) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    status: "all",
    tag: "",
    author: ""
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const authors = useMemo(
    () => Array.from(new Set(initialPosts.map((post) => post.authorName))).sort(),
    [initialPosts]
  );
  const filteredPosts = useMemo(() => {
    const query = normalizeSearchValue(filters.query);

    return initialPosts.filter((post) => {
      const matchesStatus = filters.status === "all" || post.status === filters.status;
      const matchesTag = !filters.tag || post.tags.some((tag) => tag.slug === filters.tag);
      const matchesAuthor = !filters.author || post.authorName === filters.author;
      const searchText = normalizeSearchValue(
        [post.title, post.description, post.slug, post.authorName, ...post.tags.map((tag) => tag.name)].join(" ")
      );
      const matchesQuery = !query || searchText.includes(query);

      return matchesStatus && matchesTag && matchesAuthor && matchesQuery;
    });
  }, [filters, initialPosts]);
  const publishedCount = initialPosts.filter((post) => post.status === "published").length;
  const draftCount = initialPosts.length - publishedCount;

  function updateFilter<Key extends keyof FilterState>(key: Key, value: FilterState[Key]) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  function refreshPosts() {
    setIsRefreshing(true);
    startTransition(() => {
      router.refresh();
      window.setTimeout(() => {
        setIsRefreshing(false);
      }, 450);
    });
  }

  async function createPost() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setNotice("Criando rascunho...");

    try {
      const response = await fetch("/api/admin/blog/posts", {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => null)) as BlogPostCreateResponse | null;

      if (!response.ok || !payload) {
        setNotice("Nao foi possivel criar o rascunho.");
        return;
      }

      if (!payload.ok) {
        setNotice(payload.message);
        return;
      }

      router.push(`/admin/blog/${payload.postId}`);
    } catch {
      setNotice("Nao foi possivel criar o rascunho.");
    } finally {
      setIsCreating(false);
    }
  }

  async function deletePost(post: BlogPostSummary) {
    if (deletingPostId) {
      return;
    }

    const confirmed = window.confirm(
      post.status === "published"
        ? `Excluir o post publicado "${post.title}"? Ele sairá do blog imediatamente.`
        : `Excluir o rascunho "${post.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingPostId(post.id);
    setNotice("Excluindo post...");

    try {
      const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => null)) as BlogPostDeleteResponse | null;

      if (!response.ok || !payload) {
        setNotice("Nao foi possivel excluir o post.");
        return;
      }

      if (!payload.ok) {
        setNotice(payload.message);
        return;
      }

      setNotice("Post excluido.");
      refreshPosts();
    } catch {
      setNotice("Nao foi possivel excluir o post.");
    } finally {
      setDeletingPostId(null);
    }
  }

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.kicker}>Posts</span>
          <strong>{initialPosts.length}</strong>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metric}>
            <span>Publicados</span>
            <strong>{publishedCount}</strong>
          </div>
          <div className={styles.metric}>
            <span>Rascunhos</span>
            <strong>{draftCount}</strong>
          </div>
        </div>

        <button className={styles.primaryButton} disabled={isCreating} onClick={createPost} type="button">
          {isCreating ? "Criando" : "Novo post"}
        </button>
        <button className={styles.secondaryButton} disabled={isRefreshing} onClick={refreshPosts} type="button">
          {isRefreshing ? "Atualizando" : "Atualizar"}
        </button>
        {notice ? (
          <p aria-live="polite" className={styles.notice} role="status">
            {notice}
          </p>
        ) : null}
      </aside>

      <section className={styles.main}>
        <div className={styles.commandBar}>
          <div>
            <span className={styles.kicker}>Redacao</span>
            <h2>Fila editorial</h2>
          </div>
          <span className={styles.resultCount}>{filteredPosts.length} resultado(s)</span>
        </div>

        <div className={styles.filters}>
          <label className={styles.field}>
            <span>Buscar</span>
            <input
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="Titulo, slug, tag ou autor"
              type="search"
              value={filters.query}
            />
          </label>

          <label className={styles.field}>
            <span>Status</span>
            <select
              onChange={(event) => updateFilter("status", event.target.value as FilterState["status"])}
              value={filters.status}
            >
              <option value="all">Todos</option>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Tag</span>
            <select onChange={(event) => updateFilter("tag", event.target.value)} value={filters.tag}>
              <option value="">Todas</option>
              {initialTags.map((tag) => (
                <option key={tag.slug} value={tag.slug}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Autor</span>
            <select onChange={(event) => updateFilter("author", event.target.value)} value={filters.author}>
              <option value="">Todos</option>
              {authors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredPosts.length ? (
          <div className={styles.postList}>
            {filteredPosts.map((post) => (
              <article className={styles.postRow} key={post.id}>
                <div className={styles.postMain}>
                  <div className={styles.postMeta}>
                    <span className={`${styles.status} ${styles[`status-${post.status}`]}`}>
                      {getStatusLabel(post.status)}
                    </span>
                    {post.isFeatured ? <span className={styles.featured}>Destaque</span> : null}
                    <span>{post.readingTimeMinutes} min</span>
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.description || "Sem descricao definida."}</p>
                  <div className={styles.tagList}>
                    {post.tags.map((tag) => (
                      <span key={tag.slug}>{tag.name}</span>
                    ))}
                  </div>
                </div>

                <div className={styles.postAside}>
                  <span>{post.authorName}</span>
                  <small>Atualizado em {formatDate(post.updatedAt)}</small>
                  <div className={styles.rowActions}>
                    <Link className={styles.secondaryButton} href={`/admin/blog/${post.id}`}>
                      Editar
                    </Link>
                    {post.status === "published" ? (
                      <Link className={styles.ghostButton} href={`/blog/${post.slug}`} target="_blank">
                        Publico
                      </Link>
                    ) : null}
                    <button
                      className={styles.dangerButton}
                      disabled={deletingPostId === post.id}
                      onClick={() => deletePost(post)}
                      type="button"
                    >
                      {deletingPostId === post.id ? "Excluindo" : "Excluir"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h3>Nenhum post encontrado</h3>
            <p>Ajuste os filtros ou crie um novo rascunho para começar a fila editorial.</p>
          </div>
        )}
      </section>
    </div>
  );
}
